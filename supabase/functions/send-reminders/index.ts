/**
 * send-reminders — dipanggil pg_cron tiap menit.
 *
 * Membaca jadwal pengingat dari `app_state`, mencocokkannya dengan waktu lokal
 * tiap perangkat, lalu mengirim Web Push (RFC 8291 / aes128gcm + VAPID) ke
 * semua langganan di `push_subscriptions`. Karena push dikirim dari server,
 * notifikasi tetap muncul walau aplikasi sedang tertutup.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------- utils kripto

const enc = new TextEncoder();

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(b: Uint8Array | ArrayBuffer): string {
  const arr = b instanceof Uint8Array ? b : new Uint8Array(b);
  let bin = "";
  for (const byte of arr) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/** HKDF satu blok (semua info di web push <= 32 byte output). */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

/** VAPID JWT (ES256) untuk satu origin push service. */
async function vapidAuth(endpoint: string, publicKey: string, privateKey: string, subject: string) {
  const aud = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    enc.encode(
      JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject }),
    ),
  );
  const signingInput = `${header}.${payload}`;

  const pub = b64urlToBytes(publicKey); // 65 byte, uncompressed
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privateKey,
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    ext: true,
  };
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(signingInput),
  );
  return `vapid t=${signingInput}.${bytesToB64url(sig)}, k=${publicKey}`;
}

/** Enkripsi payload sesuai RFC 8188 (aes128gcm) + RFC 8291. */
async function encryptPayload(p256dh: string, auth: string, payload: string) {
  const uaPublicRaw = b64urlToBytes(p256dh);
  const authSecret = b64urlToBytes(auth);

  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));

  const uaPublicKey = await crypto.subtle.importKey(
    "raw",
    uaPublicRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaPublicKey }, eph.privateKey, 256),
  );

  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublicRaw, asPublicRaw);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  // 0x02 = delimiter record terakhir
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublicRaw.length]), asPublicRaw, ciphertext);
}

type Sub = { endpoint: string; p256dh: string; auth: string; tz: string };
type Vapid = { publicKey: string; privateKey: string; subject: string };

async function sendPush(sub: Sub, vapid: Vapid, payload: unknown) {
  const body = await encryptPayload(sub.p256dh, sub.auth, JSON.stringify(payload));
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuth(sub.endpoint, vapid.publicKey, vapid.privateKey, vapid.subject),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "10800",
      Urgency: "normal",
    },
    body,
  });
  return res;
}

// ---------------------------------------------------------------- jadwal

type Reminders = {
  enabled?: boolean;
  habitTime?: string;
  journalTime?: string;
  focusEnabled?: boolean;
  focusEveryHours?: number;
  focusStart?: string;
  focusEnd?: string;
};
type FocusItem = { id: string; label: string; done: boolean };

function toMinutes(hhmm: string) {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Tanggal & menit-dalam-hari menurut zona waktu perangkat. */
function localNow(tz: string, at: Date) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(at);
  }
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

type Due = { stamp: string; title: string; body: string; tag: string; url: string };

/** Pengingat apa saja yang jatuh tempo untuk satu perangkat saat ini. */
function dueReminders(
  reminders: Reminders,
  focusToday: FocusItem[],
  tz: string,
  at: Date,
  grace: number,
): Due[] {
  if (!reminders?.enabled) return [];
  const { date, minutes } = localNow(tz, at);
  const out: Due[] = [];

  const fixed = [
    {
      kind: "habit",
      time: reminders.habitTime,
      title: "Waktunya ritual harian",
      body: "Buka Rayhan dan centang kebiasaan pertamamu hari ini.",
      url: "/habits",
    },
    {
      kind: "journal",
      time: reminders.journalTime,
      title: "Refleksi malam",
      body: "Catat mood, satu kemenangan hari ini, dan jadwal buat besok.",
      url: "/journal",
    },
  ];

  for (const f of fixed) {
    if (!f.time) continue;
    const diff = minutes - toMinutes(f.time);
    if (diff < 0 || diff > grace) continue;
    out.push({
      stamp: `${date}|${f.kind}|${f.time}`,
      title: f.title,
      body: f.body,
      tag: f.kind,
      url: f.url,
    });
  }

  if (reminders.focusEnabled !== false) {
    const every = Math.max(1, Number(reminders.focusEveryHours) || 3);
    const start = toMinutes(reminders.focusStart || "08:00");
    const end = toMinutes(reminders.focusEnd || "22:00");
    if (minutes >= start && minutes <= end) {
      const slot = Math.floor((minutes - start) / (every * 60));
      const slotMin = start + slot * every * 60;
      const diff = minutes - slotMin;
      if (diff >= 0 && diff <= grace) {
        const pending = focusToday.filter((f) => !f.done);
        if (pending.length > 0) {
          out.push({
            stamp: `${date}|focus|${slotMin}`,
            title: `${pending.length} fokus belum beres`,
            body: pending
              .slice(0, 3)
              .map((f) => `• ${f.label}`)
              .join("\n"),
            tag: "focus",
            url: "/",
          });
        }
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------- handler

Deno.serve(async (req) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let mode: { test?: boolean; endpoint?: string } = {};
  try {
    if (req.method === "POST") mode = await req.json();
  } catch {
    /* body kosong = jalan normal */
  }

  const [{ data: config }, { data: stateRow }, { data: subs }] = await Promise.all([
    admin.from("push_config").select("*").eq("id", "main").maybeSingle(),
    admin.from("app_state").select("data").eq("id", "main").maybeSingle(),
    admin.from("push_subscriptions").select("endpoint,p256dh,auth,tz"),
  ]);

  if (!config) {
    return Response.json({ error: "push_config belum diisi" }, { status: 500 });
  }

  // Cron mengirim shared secret; klien hanya boleh memicu mode test, sekali per menit.
  const authorized = !!config.cron_secret && req.headers.get("x-reminder-secret") === config.cron_secret;
  if (!authorized) {
    if (!mode.test) return Response.json({ error: "unauthorized" }, { status: 401 });
    const minuteStamp = `throttle|${new Date().toISOString().slice(0, 16)}`;
    const { data: slot } = await admin
      .from("push_log")
      .upsert(
        { endpoint: "__test__", stamp: minuteStamp },
        { onConflict: "endpoint,stamp", ignoreDuplicates: true },
      )
      .select("stamp");
    if (!slot || slot.length === 0) {
      return Response.json({ error: "tunggu sebentar sebelum tes lagi" }, { status: 429 });
    }
  }

  const vapid: Vapid = {
    publicKey: config.vapid_public_key,
    privateKey: config.vapid_private_key,
    subject: config.vapid_subject,
  };

  let targets = (subs ?? []) as Sub[];
  if (mode.endpoint) targets = targets.filter((s) => s.endpoint === mode.endpoint);
  if (targets.length === 0) return Response.json({ sent: 0, reason: "tidak ada langganan" });

  const state = (stateRow?.data ?? {}) as {
    reminders?: Reminders;
    focusItems?: Record<string, FocusItem[]>;
  };
  const now = new Date();
  const results: unknown[] = [];
  let sent = 0;

  for (const sub of targets) {
    const { date } = localNow(sub.tz, now);
    const focusToday = state.focusItems?.[date] ?? [];

    const due: Due[] = mode.test
      ? [
          {
            stamp: `test|${now.toISOString()}`,
            title: "Push aktif ✅",
            body: "Pengingat sekarang dikirim dari server, walau aplikasi ditutup.",
            tag: "test",
            url: "/profile",
          },
        ]
      : dueReminders(state.reminders ?? {}, focusToday, sub.tz, now, 2);

    for (const item of due) {
      if (!mode.test) {
        // Klaim stamp dulu supaya dua run cron tidak mengirim dobel.
        const { data: claimed, error } = await admin
          .from("push_log")
          .upsert(
            { endpoint: sub.endpoint, stamp: item.stamp },
            { onConflict: "endpoint,stamp", ignoreDuplicates: true },
          )
          .select("stamp");
        if (error || !claimed || claimed.length === 0) continue;
      }

      try {
        const res = await sendPush(sub, vapid, {
          title: item.title,
          body: item.body,
          tag: item.tag,
          url: item.url,
        });
        if (res.ok) {
          sent++;
          results.push({ endpoint: sub.endpoint.slice(-12), stamp: item.stamp, status: res.status });
        } else {
          const text = await res.text().catch(() => "");
          results.push({
            endpoint: sub.endpoint.slice(-12),
            stamp: item.stamp,
            status: res.status,
            error: text.slice(0, 200),
          });
          if (res.status === 404 || res.status === 410) {
            // Langganan sudah mati — buang.
            await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          } else if (!mode.test) {
            // Lepas klaim supaya bisa dicoba lagi menit berikutnya.
            await admin
              .from("push_log")
              .delete()
              .eq("endpoint", sub.endpoint)
              .eq("stamp", item.stamp);
          }
        }
      } catch (e) {
        results.push({ endpoint: sub.endpoint.slice(-12), error: String(e).slice(0, 200) });
        if (!mode.test) {
          await admin.from("push_log").delete().eq("endpoint", sub.endpoint).eq("stamp", item.stamp);
        }
      }
    }
  }

  // Bersih-bersih log lama sesekali.
  if (Math.random() < 0.02) {
    await admin
      .from("push_log")
      .delete()
      .lt("sent_at", new Date(Date.now() - 3 * 864e5).toISOString());
  }

  return Response.json({ sent, checked: targets.length, results });
});
