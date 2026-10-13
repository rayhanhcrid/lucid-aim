/**
 * Kalimat bebas → draf transaksi. Dipakai "Isi cepat" di form Catat:
 *
 * - `normalizeParsed` merapikan hasil dari mana pun (AI maupun lokal) jadi
 *   draf form yang aman: id akun/kategori dicek, tanggal & jumlah divalidasi.
 * - `parseLocally` adalah pengenal sederhana berbasis aturan — cadangan saat AI
 *   tidak tersedia, supaya fitur ini tetap jalan walau offline atau kuota habis.
 *
 * Fungsi murni, tanpa React; aman dipakai di klien maupun server.
 */

import type { FinAccount, FinCategory, FinTxType } from "./store";
import type { TxDraft } from "./finance";

/** Hasil mentah pengenal sebelum dirapikan; semua kolom boleh kosong. */
export type ParsedTx = {
  type?: FinTxType;
  amount?: number;
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  date?: string; // yyyy-mm-dd
  description?: string;
};

type AccountRef = Pick<FinAccount, "id" | "name" | "type">;
type CategoryRef = Pick<FinCategory, "id" | "name" | "type">;

/* --------------------------------- Tanggal --------------------------------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12);
};

const addDays = (iso: string, n: number) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};

const isValidIso = (s: string) => ISO_DATE.test(s) && toIso(fromIso(s)) === s;

const DAYS: Record<string, number> = {
  minggu: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  "jum'at": 5,
  sabtu: 6,
};

/** Kata waktu dalam kalimat → tanggal. `undefined` kalau tidak disebut. */
export function parseDate(text: string, today: string): string | undefined {
  const t = text.toLowerCase();
  if (/\bkemar[ie]n lusa\b/.test(t)) return addDays(today, -2);
  if (/\bkemar[ie]n\b/.test(t)) return addDays(today, -1);
  const ago = t.match(/\b(\d{1,2}) hari (?:yang )?lalu\b/);
  if (ago) return addDays(today, -Number(ago[1]));
  if (/\bminggu (?:lalu|kemar[ie]n)\b/.test(t)) return addDays(today, -7);
  if (/\b(?:hari ini|tadi|barusan)\b/.test(t)) return today;

  const tgl = t.match(/\b(?:tanggal|tgl)\.?\s*(\d{1,2})\b/);
  if (tgl) {
    const day = Number(tgl[1]);
    const base = fromIso(today);
    const target = new Date(base.getFullYear(), base.getMonth(), day, 12);
    // "tgl 28" saat ini masih tanggal 13 → maksudnya bulan lalu.
    if (day > base.getDate()) target.setMonth(target.getMonth() - 1);
    if (target.getDate() === day) return toIso(target);
  }

  for (const [name, wd] of Object.entries(DAYS)) {
    // "minggu" juga berarti "pekan" — hanya dianggap hari kalau tidak diikuti kata waktu.
    const re =
      name === "minggu"
        ? /\b(?:hari )?minggu\b(?! (?:ini|depan|lalu|kemar[ie]n))/
        : new RegExp(`\\b${name}\\b`);
    if (!re.test(t)) continue;
    const diff = (fromIso(today).getDay() - wd + 7) % 7;
    return addDays(today, -diff);
  }
  return undefined;
}

/* --------------------------------- Jumlah ---------------------------------- */

const FACTORS: Record<string, number> = {
  rb: 1e3,
  ribu: 1e3,
  rebu: 1e3,
  k: 1e3,
  jt: 1e6,
  juta: 1e6,
  m: 1e9,
  miliar: 1e9,
  milyar: 1e9,
};

const AMOUNT_RE =
  /(rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(ribu|rebu|rb|k|juta|jt|miliar|milyar|m)?(?![a-z\d])/gi;

const WORD_AMOUNTS: [RegExp, number][] = [
  [/\bsetengah juta\b/i, 500_000],
  [/\bsejuta\b/i, 1_000_000],
  [/\bseratus ribu\b/i, 100_000],
  [/\bseribu\b/i, 1_000],
];

type AmountHit = { value: number; start: number; end: number };

function toNumber(raw: string): number {
  // "45.000" / "1,500,000" = pemisah ribuan; "1,5" / "2.5" = desimal.
  if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) return Number(raw.replace(/[.,]/g, ""));
  return Number(raw.replace(",", "."));
}

/** Nominal rupiah paling masuk akal dalam kalimat, beserta posisinya. */
export function findAmount(text: string): AmountHit | undefined {
  const hits: (AmountHit & { strong: boolean })[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const [whole, rp, raw, suffix] = m;
    const value = toNumber(raw!) * (suffix ? FACTORS[suffix.toLowerCase()]! : 1);
    if (!Number.isFinite(value) || value <= 0) continue;
    const strong = !!rp || !!suffix;
    // Angka kecil tanpa "rb"/"Rp" biasanya jumlah barang atau tanggal, bukan uang.
    if (!strong && value < 500) continue;
    hits.push({ value, start: m.index!, end: m.index! + whole.length, strong });
  }
  for (const [re, value] of WORD_AMOUNTS) {
    const m = re.exec(text);
    if (m) hits.push({ value, start: m.index, end: m.index + m[0].length, strong: true });
  }
  if (hits.length === 0) return undefined;
  const strong = hits.filter((h) => h.strong);
  const pool = strong.length ? strong : hits;
  return pool.reduce((best, h) => (h.value > best.value ? h : best));
}

/* ------------------------------ Akun & jenis ------------------------------- */

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type AccountHit = { id: string; start: number; end: number };

/** Akun yang disebut dalam kalimat, urut sesuai kemunculannya. */
export function findAccounts(text: string, accounts: AccountRef[]): AccountHit[] {
  const lower = text.toLowerCase();
  const hits: AccountHit[] = [];
  for (const a of accounts) {
    const name = a.name.toLowerCase().trim();
    let start = name ? lower.indexOf(name) : -1;
    let len = name.length;
    if (start < 0 && compact(name).length >= 3) {
      // "go pay" vs "gopay"
      const re = new RegExp(compact(name).split("").join("\\s?"), "i");
      const m = re.exec(lower);
      if (m) {
        start = m.index;
        len = m[0].length;
      }
    }
    if (start < 0 && a.type === "cash") {
      const m = /\b(?:uang tunai|tunai|cash|cas|dompet)\b/.exec(lower);
      if (m) {
        start = m.index;
        len = m[0].length;
      }
    }
    if (start >= 0) hits.push({ id: a.id, start, end: start + len });
  }
  return hits.sort((a, b) => a.start - b.start);
}

const INCOME_RE =
  /\b(gaji|gajian|terima|nerima|diterima|dapat|dapet|bonus|thr|dividen|cashback|refund|dibayar|bayaran|honor|komisi|jual|menjual|pemasukan|cuan|transferan masuk|uang masuk)\b/;
const TRANSFER_RE =
  /\b(transfer|tf|pindah(?:in)?|top ?up|isi saldo|isi ulang saldo|tarik tunai|setor tunai|nabung ke|mindahin)\b/;

function guessType(text: string, accountCount: number): FinTxType {
  const t = text.toLowerCase();
  if (TRANSFER_RE.test(t) && accountCount >= 1) return "transfer";
  if (INCOME_RE.test(t)) return "income";
  return "expense";
}

/** Untuk transfer: akun sesudah "ke/top up" = tujuan, sesudah "dari/pakai" = sumber. */
function resolveTransfer(text: string, hits: AccountHit[]) {
  const lower = text.toLowerCase();
  let from: string | undefined;
  let to: string | undefined;
  for (const h of hits) {
    const before = lower.slice(Math.max(0, h.start - 16), h.start);
    if (/(?:\bke|top ?up|isi(?: saldo)?|nabung ke)\s*$/.test(before)) to ??= h.id;
    else if (/\b(?:dari|pakai|pake|via|lewat)\s*$/.test(before)) from ??= h.id;
  }
  for (const h of hits) {
    if (h.id === from || h.id === to) continue;
    if (!from) from = h.id;
    else if (!to) to = h.id;
  }
  return { from, to };
}

/* -------------------------------- Kategori --------------------------------- */

/** Kata kunci → kategori bawaan. Urutan penting: yang lebih spesifik di atas. */
const CATEGORY_KEYWORDS: [string, RegExp][] = [
  ["cat-gaji", /\b(gaji|gajian|salary)\b/],
  ["cat-bonus", /\b(bonus|hadiah|thr|angpao|angpau|kado)\b/],
  ["cat-investasi", /\b(dividen|bunga|kupon|profit|cuan|capital gain)\b/],
  [
    "cat-makan",
    /\b(makan|minum|kopi|ngopi|nasi|bakso|mie|mi ayam|jajan|sarapan|lunch|dinner|snack|gofood|grabfood|shopeefood|resto|warteg|warung|cafe|kafe|teh|boba|roti|ayam|martabak|sate|seblak)\b/,
  ],
  [
    "cat-transport",
    /\b(ojek|ojol|gojek|goride|gocar|grab|grabbike|grabcar|bensin|pertalite|pertamax|parkir|tol|krl|mrt|lrt|transjakarta|kereta|busway|bus|taksi|taxi|travel)\b/,
  ],
  [
    "cat-tagihan",
    /\b(listrik|pln|token|wifi|internet|indihome|pulsa|kuota|paket data|pdam|bpjs|kos|kost|kontrakan|sewa|cicilan|tagihan|iuran|asuransi|langganan)\b/,
  ],
  [
    "cat-hiburan",
    /\b(nonton|bioskop|netflix|spotify|youtube premium|game|steam|konser|karaoke|hiburan|disney|liburan)\b/,
  ],
  [
    "cat-kesehatan",
    /\b(obat|dokter|apotek|apotik|vitamin|klinik|rumah sakit|periksa|gym|fitness)\b/,
  ],
  ["cat-pendidikan", /\b(buku|kursus|kuliah|ukt|spp|les|bootcamp|seminar|udemy)\b/],
  [
    "cat-belanja",
    /\b(belanja|shopee|tokopedia|tokped|lazada|baju|celana|sepatu|indomaret|alfamart|supermarket|minimarket|sabun|skincare|beli)\b/,
  ],
];

function guessCategory(
  text: string,
  type: FinTxType,
  categories: CategoryRef[],
): string | undefined {
  if (type === "transfer") return undefined;
  const t = text.toLowerCase();
  const own = categories
    .filter((c) => c.type === type && c.name.trim().length >= 3)
    .sort((a, b) => b.name.length - a.name.length)
    .find((c) => t.includes(c.name.toLowerCase()));
  if (own) return own.id;
  for (const [id, re] of CATEGORY_KEYWORDS) {
    const c = categories.find((x) => x.id === id);
    if (c && c.type === type && re.test(t)) return id;
  }
  return undefined;
}

/* ------------------------------- Keterangan -------------------------------- */

const FILLER_RE =
  /\b(pakai|pake|via|lewat|dari|ke|dengan|seharga|sebesar|habis|abis|tadi|barusan|hari ini|kemar[ie]n(?: lusa)?|\d{1,2} hari (?:yang )?lalu|minggu (?:lalu|kemar[ie]n)|(?:tanggal|tgl)\.?\s*\d{1,2}|buat|untuk|bayar pakai|rp)\b/gi;

function describe(text: string, cut: { start: number; end: number }[]): string | undefined {
  let s = text;
  // Potong dari belakang supaya posisi yang lain tidak bergeser.
  for (const c of [...cut].sort((a, b) => b.start - a.start)) {
    s = s.slice(0, c.start) + " " + s.slice(c.end);
  }
  s = s
    .replace(FILLER_RE, " ")
    .replace(/[\s,.;:!-]+/g, " ")
    .trim();
  if (s.length < 2) return undefined;
  s = s.length > 60 ? s.slice(0, 60).trim() : s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------ Pengenal lokal ----------------------------- */

const SEPARATOR_RE = /(\s*(?:[,;\n]|\bdan\b|\bsama\b|\bterus\b|\btrus\b|\blalu\b|\bplus\b)\s*)/i;

/** Pecah kalimat jadi beberapa transaksi; potongan tanpa nominal ikut ke tetangganya. */
function splitSegments(text: string): string[] {
  const parts = text.split(SEPARATOR_RE);
  const segments: string[] = [];
  let carry = "";
  for (let i = 0; i < parts.length; i += 2) {
    const seg = carry + (parts[i] ?? "");
    const sep = parts[i + 1] ?? "";
    if (findAmount(seg)) {
      segments.push(seg);
      carry = "";
    } else {
      carry = seg + sep;
    }
  }
  if (carry.trim()) {
    if (segments.length) segments[segments.length - 1] += " " + carry;
    else segments.push(carry);
  }
  return segments.map((s) => s.trim()).filter(Boolean);
}

/**
 * Pengenal berbasis aturan: "kopi 25rb pakai gopay kemarin, parkir 5rb" →
 * dua transaksi. Akun/tanggal yang hanya disebut sekali berlaku untuk semuanya.
 */
export function parseLocally(
  text: string,
  accounts: AccountRef[],
  categories: CategoryRef[],
  today: string,
): ParsedTx[] {
  const wholeDate = parseDate(text, today);
  const wholeAccounts = findAccounts(text, accounts);

  return splitSegments(text).map((seg) => {
    const amount = findAmount(seg);
    const accHits = findAccounts(seg, accounts);
    const type = guessType(seg, accHits.length || wholeAccounts.length);
    let accountId: string | undefined;
    let toAccountId: string | undefined;
    if (type === "transfer") {
      const { from, to } = resolveTransfer(seg, accHits);
      accountId = from;
      toAccountId = to;
    } else {
      accountId = accHits[0]?.id ?? (wholeAccounts.length === 1 ? wholeAccounts[0]!.id : undefined);
    }
    return {
      type,
      amount: amount?.value,
      accountId,
      toAccountId,
      categoryId: guessCategory(seg, type, categories),
      date: parseDate(seg, today) ?? wholeDate,
      description: describe(seg, [...(amount ? [amount] : []), ...accHits]),
    };
  });
}

/* --------------------------------- Rapikan --------------------------------- */

/**
 * Hasil pengenal → draf form yang aman dipakai. Id yang tidak dikenal dibuang,
 * jumlah dibulatkan, tanggal tidak valid jadi hari ini, akun kosong diisi
 * `fallbackAccountId` (akun terakhir dipakai).
 */
export function normalizeParsed(
  items: ParsedTx[],
  ctx: {
    accounts: AccountRef[];
    categories: CategoryRef[];
    today: string;
    fallbackAccountId: string;
  },
): TxDraft[] {
  const accountIds = new Set(ctx.accounts.map((a) => a.id));
  const fallback = accountIds.has(ctx.fallbackAccountId)
    ? ctx.fallbackAccountId
    : (ctx.accounts[0]?.id ?? "");

  return items.slice(0, 10).map((it) => {
    const type: FinTxType = it.type === "income" || it.type === "transfer" ? it.type : "expense";
    const amount =
      typeof it.amount === "number" && Number.isFinite(it.amount) && it.amount > 0
        ? String(Math.min(Math.round(it.amount), 9_999_999_999_999))
        : "";
    let accountId = it.accountId && accountIds.has(it.accountId) ? it.accountId : "";
    let toAccountId =
      type === "transfer" && it.toAccountId && accountIds.has(it.toAccountId) ? it.toAccountId : "";
    // Transfer yang cuma tahu tujuannya: sumbernya ambil akun terakhir dipakai.
    if (!accountId) accountId = fallback === toAccountId ? "" : fallback;
    if (toAccountId === accountId) toAccountId = "";
    const category =
      type !== "transfer" ? ctx.categories.find((c) => c.id === it.categoryId) : undefined;

    return {
      type,
      amount,
      date: it.date && isValidIso(it.date) ? it.date : ctx.today,
      accountId,
      toAccountId,
      categoryId: category && category.type === type ? category.id : "",
      description: (it.description ?? "").trim().slice(0, 120),
    };
  });
}
