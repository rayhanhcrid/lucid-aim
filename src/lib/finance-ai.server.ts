import { z } from "zod";
import type { ParsedTx } from "./finance-parse";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export type ParseRequest = {
  text: string;
  today: string; // yyyy-mm-dd
  accounts: { id: string; name: string; type: string }[];
  categories: { id: string; name: string; type: "income" | "expense" }[];
};

const SYSTEM_PROMPT = [
  "Kamu mengubah catatan keuangan berbahasa Indonesia (sering hasil dikte suara, santai, bisa salah ketik) menjadi data transaksi.",
  "Satu kalimat bisa berisi beberapa transaksi — pisahkan masing-masing.",
  "Jumlah selalu rupiah bulat: 45rb/45 ribu/45k = 45000, 1,5jt/1.5 juta = 1500000, 45.000 = 45000.",
  "type: expense (keluar uang), income (uang masuk: gaji, bonus, dibayar, jual), transfer (pindah uang antar akun sendiri: transfer, top up, isi saldo, tarik tunai).",
  "accountId dan toAccountId WAJIB diambil dari daftar akun yang diberikan; kalau tidak disebut atau tidak yakin, isi string kosong.",
  "Untuk transfer: accountId = sumber, toAccountId = tujuan. Untuk income/expense toAccountId kosong.",
  "categoryId WAJIB dari daftar kategori dengan jenis yang sama; pilih yang paling cocok, kosongkan kalau tidak ada yang cocok atau kalau transfer.",
  "date format yyyy-mm-dd, dihitung dari tanggal hari ini yang diberikan (kemarin = hari ini - 1). Kalau tidak disebut, pakai hari ini.",
  "description: keterangan singkat (maksimal 40 karakter) dalam bahasa Indonesia, huruf depan kapital, tanpa nominal dan tanpa nama akun.",
  "Kalau tidak ada transaksi sama sekali dalam teks, kembalikan items kosong. Jangan mengarang nominal.",
].join(" ");

const TOOL = {
  type: "function" as const,
  function: {
    name: "catat_transaksi",
    description: "Simpan transaksi yang ditemukan dalam teks pengguna.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["expense", "income", "transfer"] },
              amount: { type: "number", description: "Rupiah, bilangan bulat positif" },
              accountId: { type: "string" },
              toAccountId: { type: "string" },
              categoryId: { type: "string" },
              date: { type: "string", description: "yyyy-mm-dd" },
              description: { type: "string" },
            },
            required: ["type", "amount", "description"],
          },
        },
      },
      required: ["items"],
    },
  },
};

const blankToUndef = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

const ItemSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]).catch("expense"),
  amount: z.coerce.number().catch(0),
  accountId: z.unknown().transform(blankToUndef),
  toAccountId: z.unknown().transform(blankToUndef),
  categoryId: z.unknown().transform(blankToUndef),
  date: z.unknown().transform(blankToUndef),
  description: z.unknown().transform(blankToUndef),
});

const ResultSchema = z.object({ items: z.array(z.unknown()) });

/** Ambil argumen tool call; kalau model malah membalas teks JSON, itu juga diterima. */
function extractPayload(json: unknown): unknown {
  const msg = (json as { choices?: { message?: Record<string, unknown> }[] })?.choices?.[0]
    ?.message;
  const call = (msg?.tool_calls as { function?: { arguments?: string } }[] | undefined)?.[0];
  const raw =
    call?.function?.arguments ??
    (typeof msg?.content === "string" ? msg.content.replace(/^```(?:json)?|```$/g, "") : "");
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/** Hasil model → ParsedTx; id yang tidak ada di daftar dibuang di sini juga. */
export function sanitizeItems(payload: unknown, req: ParseRequest): ParsedTx[] {
  const accountIds = new Set(req.accounts.map((a) => a.id));
  const categoryIds = new Set(req.categories.map((c) => c.id));
  // Model kadang membalas array langsung, atau menyelipkan satu item rusak —
  // item yang rusak saja yang dibuang, sisanya tetap dipakai.
  const raw = Array.isArray(payload)
    ? payload
    : (ResultSchema.safeParse(payload).data?.items ?? []);
  return raw
    .slice(0, 10)
    .flatMap((x) => {
      const it = ItemSchema.safeParse(x);
      return it.success ? [it.data] : [];
    })
    .filter((it) => Number.isFinite(it.amount) && it.amount > 0)
    .map((it) => ({
      type: it.type,
      amount: Math.round(it.amount),
      accountId: it.accountId && accountIds.has(it.accountId) ? it.accountId : undefined,
      toAccountId: it.toAccountId && accountIds.has(it.toAccountId) ? it.toAccountId : undefined,
      categoryId: it.categoryId && categoryIds.has(it.categoryId) ? it.categoryId : undefined,
      date: it.date,
      description: it.description?.slice(0, 60),
    }));
}

export async function requestTxParse(apiKey: string, req: ParseRequest): Promise<ParsedTx[]> {
  const context = {
    hariIni: req.today,
    akun: req.accounts,
    kategori: req.categories,
  };
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: `Konteks (JSON):\n${JSON.stringify(context)}` },
        { role: "user", content: req.text },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: TOOL.function.name } },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("NO_CREDITS");
    throw new Error(`Gateway error [${response.status}]: ${body.slice(0, 300)}`);
  }

  return sanitizeItems(extractPayload(await response.json()), req);
}
