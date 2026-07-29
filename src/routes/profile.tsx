import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, X, Bell, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { todayKey, useStore } from "@/lib/store";
import {
  notificationPermission,
  requestNotificationPermission,
  showReminder,
} from "@/lib/reminders";
import {
  disablePush,
  enablePush,
  getPushState,
  needsInstallForPush,
  sendTestPush,
  type PushState,
} from "@/lib/push";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil · Rayhan" },
      { name: "description", content: "Atur identitas dan visi yang jadi arah hidup kamu." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const name = useStore((s) => s.name);
  const setName = useStore((s) => s.setName);
  const becoming = useStore((s) => s.becoming);
  const addBecoming = useStore((s) => s.addBecoming);
  const removeBecoming = useStore((s) => s.removeBecoming);
  const vision = useStore((s) => s.vision);
  const addVision = useStore((s) => s.addVision);
  const removeVision = useStore((s) => s.removeVision);
  const visionYear = useStore((s) => s.visionYear);
  const setVisionYear = useStore((s) => s.setVisionYear);
  const focusItems = useStore((s) => s.focusItems);
  const addFocusItem = useStore((s) => s.addFocusItem);
  const removeFocusItem = useStore((s) => s.removeFocusItem);
  const today = todayKey();
  const todaysFocus = focusItems[today] || [];

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">You</p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Profil</h1>
      </header>

      <div className="animate-rise space-y-4">
        <label className="block rounded-2xl card-cinema p-4">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Your Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent font-serif text-2xl outline-none"
          />
        </label>

        <label className="block rounded-2xl card-cinema p-4">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Vision Year
          </span>
          <input
            value={visionYear}
            onChange={(e) => setVisionYear(e.target.value)}
            className="w-full bg-transparent font-serif text-2xl outline-none"
          />
        </label>

        <TagList title="Who I'm Becoming" items={becoming} onAdd={addBecoming} onRemove={removeBecoming} placeholder="Add identity" />

        <TagList title={`Vision ${visionYear}`} items={vision} onAdd={addVision} onRemove={removeVision} placeholder="Add vision item" />

        <FocusList
          items={todaysFocus}
          onAdd={(label) => addFocusItem(today, label)}
          onRemove={(id) => removeFocusItem(today, id)}
        />
        <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-xs text-muted-foreground hairline">
          Jadwal for tomorrow is now set directly di halaman <span className="text-foreground">Jurnal</span>, and bisa disesuaikan lagi dari halaman <span className="text-foreground">Beranda</span>.
        </p>

        <ReminderSettings />
      </div>
    </AppShell>
  );
}

function ReminderSettings() {
  const reminders = useStore((s) => s.reminders);
  const setReminders = useStore((s) => s.setReminders);
  const [perm, setPerm] = useState<string>("default");

  useEffect(() => {
    setPerm(notificationPermission());
  }, []);

  const unsupported = perm === "unsupported";

  return (
    <div className="rounded-2xl card-cinema p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Pengingat</p>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={reminders.enabled}
            onChange={async (e) => {
              const on = e.target.checked;
              if (on && perm !== "granted") {
                const res = await requestNotificationPermission();
                setPerm(res);
                if (res !== "granted") return;
              }
              setReminders({ enabled: on });
            }}
            className="size-4 accent-[var(--color-primary,teal)]"
          />
          Aktifkan
        </label>
      </div>

      {unsupported ? (
        <p className="text-xs text-muted-foreground">
          Browser ini belum mendukung notifikasi. Coba install aplikasi ke Home Screen.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <TimeRow
            label="Ritual pagi"
            value={reminders.habitTime}
            onChange={(v) => setReminders({ habitTime: v })}
          />
          <TimeRow
            label="Refleksi malam"
            value={reminders.journalTime}
            onChange={(v) => setReminders({ journalTime: v })}
          />

          <div className="rounded-xl bg-white/[0.04] p-3">
            <label className="mb-3 flex items-center justify-between gap-3 text-sm">
              <span>Ingatkan fokus yang belum beres</span>
              <input
                type="checkbox"
                checked={reminders.focusEnabled}
                onChange={(e) => setReminders({ focusEnabled: e.target.checked })}
                className="size-4"
              />
            </label>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Setiap</span>
              <select
                value={reminders.focusEveryHours}
                onChange={(e) => setReminders({ focusEveryHours: Number(e.target.value) })}
                className="rounded-lg bg-white/[0.06] px-2 py-1 text-sm outline-none"
              >
                {[1, 2, 3, 4, 6].map((h) => (
                  <option key={h} value={h}>
                    {h} jam
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <TimeRow
                label="Mulai"
                value={reminders.focusStart}
                onChange={(v) => setReminders({ focusStart: v })}
              />
              <TimeRow
                label="Sampai"
                value={reminders.focusEnd}
                onChange={(v) => setReminders({ focusEnd: v })}
              />
            </div>
          </div>

          <PushSettings onPermissionChange={setPerm} />

          <button
            onClick={async () => {
              if (perm !== "granted") {
                const res = await requestNotificationPermission();
                setPerm(res);
                if (res === "denied") {
                  toast.error("Izin notifikasi ditolak. Aktifkan lewat setelan situs di HP kamu.");
                  return;
                }
                if (res !== "granted") return;
              }
              const ok = await showReminder(
                "Contoh pengingat",
                "Masih ada fokus yang menunggu diselesaikan.",
              );
              if (!ok) {
                toast.error(
                  "Notifikasi lokal diblokir browser ini. Pakai toggle push di atas — itu jalur yang dipakai pengingat sungguhan.",
                );
              }
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs hover:bg-white/[0.1]"
          >
            <Bell className="size-3.5" />
            {perm === "granted" ? "Coba notifikasi lokal" : "Izinkan notifikasi"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Web push: pengingat dikirim dari server, jadi tetap muncul di HP walau
 * aplikasinya sudah ditutup.
 */
function PushSettings({ onPermissionChange }: { onPermissionChange: (p: string) => void }) {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPushState().then(setState);
  }, []);

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      const next = on ? await enablePush() : await disablePush();
      setState(next);
      onPermissionChange(typeof Notification !== "undefined" ? Notification.permission : "default");
      if (on && next === "on") toast.success("Notifikasi HP aktif — walau app ditutup.");
      if (on && next === "denied") toast.error("Izin notifikasi ditolak di setelan browser.");
      if (on && next === "no-sw")
        toast.error("Buka lewat aplikasi yang sudah di-install, bukan preview.");
      if (!on) toast.success("Notifikasi HP dimatikan.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah langganan notifikasi.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "unsupported") {
    return (
      <p className="rounded-xl bg-white/[0.04] p-3 text-[11px] leading-relaxed text-muted-foreground">
        Browser ini belum mendukung push. Di iPhone, install dulu aplikasinya lewat Safari → Share →
        Add to Home Screen.
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-white/[0.04] p-3">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2">
          <Smartphone className="size-4 shrink-0 text-muted-foreground" />
          Kirim ke HP walau app ditutup
        </span>
        <input
          type="checkbox"
          disabled={busy || state === "loading"}
          checked={state === "on"}
          onChange={(e) => toggle(e.target.checked)}
          className="size-4 disabled:opacity-40"
        />
      </label>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {state === "on"
          ? "Aktif. Pengingat dikirim dari server sesuai jadwal di atas, sesuai zona waktu perangkat ini."
          : state === "denied"
            ? "Izin notifikasi ditolak. Aktifkan lagi lewat setelan situs/aplikasi di HP kamu."
            : state === "no-sw"
              ? "Belum tersedia di sesi ini — buka aplikasi yang sudah di-install ke Home Screen."
              : needsInstallForPush()
                ? "Di iPhone, install dulu ke Home Screen (Safari → Share → Add to Home Screen) baru push bisa aktif."
                : "Tanpa ini, pengingat hanya jalan selama aplikasi masih terbuka."}
      </p>

      {state === "on" && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await sendTestPush();
              toast.success(`Push uji dikirim ke ${res.sent} perangkat.`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Gagal mengirim push uji.");
            } finally {
              setBusy(false);
            }
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs hover:bg-white/[0.1] disabled:opacity-40"
        >
          <Bell className="size-3.5" />
          Tes push dari server
        </button>
      )}
    </div>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-1 items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg bg-white/[0.06] px-2 py-1 text-sm outline-none"
      />
    </label>
  );
}

function TagList({
  title,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  title: string;
  items: { id: string; label: string }[];
  onAdd: (v: string) => void;
  onRemove: (id: string) => void;
  placeholder: string;
}) {
  const [v, setV] = useState("");
  return (
    <div className="rounded-2xl card-cinema p-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <ul className="mb-3 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <li key={i.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm">
            {i.label}
            <button onClick={() => onRemove(i.id)} className="text-muted-foreground hover:text-foreground" aria-label={`Hapus ${i.label}`}>
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.trim()) return;
          onAdd(v.trim());
          setV("");
        }}
        className="flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-2"
      >
        <Plus className="size-4 text-muted-foreground" />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  );
}

function FocusList({
  items,
  onAdd,
  onRemove,
}: {
  items: { id: string; label: string; done: boolean }[];
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [v, setV] = useState("");
  return (
    <div className="rounded-2xl card-cinema p-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Today's Fokus</p>
      <ul className="mb-3 space-y-2">
        {items.map((f) => (
          <li key={f.id} className="flex items-center gap-3 text-sm">
            <span className={["size-1.5 rounded-full", f.done ? "bg-white/20" : "bg-gold"].join(" ")} />
            <span className={["flex-1", f.done && "text-muted-foreground line-through"].filter(Boolean).join(" ")}>
              {f.label}
            </span>
            <button onClick={() => onRemove(f.id)} className="text-muted-foreground hover:text-foreground" aria-label="Hapus">
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.trim()) return;
          onAdd(v.trim());
          setV("");
        }}
        className="flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-2"
      >
        <Plus className="size-4 text-muted-foreground" />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Add fokus for today"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  );
}

