/**
 * Hitungan arus kas — fungsi murni di atas data store, tanpa React.
 *
 * Saldo akun tidak pernah disimpan: selalu diturunkan dari saldo awal + semua
 * transaksi. Jadi menambah, mengubah, atau menghapus transaksi otomatis
 * membetulkan saldo tanpa risiko angkanya melenceng.
 */

import {
  nowDay,
  type FinAccount,
  type FinAccountType,
  type FinBudget,
  type FinCategory,
  type FinTransaction,
  type FinTxType,
} from "./store";

/* ---------------------------------- Format ---------------------------------- */

/** "Rp 1.250.000" — tanpa tanda; pemanggil yang menambahkan +/− kalau perlu. */
export const rupiah = (n: number) => "Rp " + Math.round(Math.abs(n)).toLocaleString("id-ID");

/** Rupiah bertanda: "+Rp 50.000" / "−Rp 50.000". */
export const signedRupiah = (n: number) => (n < 0 ? "−" : "+") + rupiah(n);

const compactFmt = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Angka ringkas untuk sumbu & label sempit: "1,2 jt", "850 rb". */
export const compactRupiah = (n: number) => (n < 0 ? "−" : "") + compactFmt.format(Math.abs(n));

/** "1250000" → "1.250.000" untuk ditampilkan di kolom isian. */
export const groupDigits = (digits: string) =>
  digits ? Number(digits).toLocaleString("id-ID") : "";

/* ---------------------------------- Bulan ----------------------------------- */

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** "yyyy-mm" untuk sebuah tanggal (default: hari ini, ikut aturan jam 3 pagi). */
export const monthKey = (d = nowDay()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** "2026-10" → "Okt 26". */
export const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MONTH_NAMES[Number(mm) - 1] ?? mm} ${y?.slice(2) ?? ""}`;
};

/** "2026-10" → "Oktober 2026". */
export const monthLongLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MONTH_LONG[Number(mm) - 1] ?? mm} ${y ?? ""}`;
};

/** Geser kunci bulan: shiftMonth("2026-01", -1) → "2025-12". */
export const shiftMonth = (m: string, delta: number) => {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(y!, mm! - 1 + delta, 1);
  return monthKey(d);
};

/** "2026-10-13" → "Selasa, 13 Okt". */
export const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return `${DAY_NAMES[date.getDay()]}, ${d} ${MONTH_NAMES[m! - 1]}`;
};

/** Sisa hari di bulan ini, termasuk hari ini. */
export const daysLeftInMonth = (today = nowDay()) => {
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return last - today.getDate() + 1;
};

/* ---------------------------------- Akun ------------------------------------ */

export const ACCOUNT_TYPES: { id: FinAccountType; label: string }[] = [
  { id: "bank", label: "Bank" },
  { id: "ewallet", label: "E-wallet" },
  { id: "cash", label: "Tunai" },
  { id: "investment", label: "Investasi" },
];

export const accountTypeLabel = (t: FinAccountType) =>
  ACCOUNT_TYPES.find((a) => a.id === t)?.label ?? t;

/** Pengaruh satu transaksi ke saldo tiap akun yang disentuhnya. */
export function txEffects(t: FinTransaction): [accountId: string, delta: number][] {
  if (t.type === "income") return [[t.accountId, t.amount]];
  if (t.type === "expense") return [[t.accountId, -t.amount]];
  const out: [string, number][] = [[t.accountId, -t.amount]];
  if (t.toAccountId) out.push([t.toAccountId, t.amount]);
  return out;
}

/** Saldo berjalan tiap akun: saldo awal + semua transaksi yang menyentuhnya. */
export function accountBalances(
  accounts: FinAccount[],
  txs: FinTransaction[],
): Map<string, number> {
  const out = new Map(accounts.map((a) => [a.id, a.openingBalance]));
  for (const t of txs) {
    for (const [id, delta] of txEffects(t)) {
      const cur = out.get(id);
      if (cur !== undefined) out.set(id, cur + delta);
    }
  }
  return out;
}

export const netWorth = (balances: Map<string, number>) =>
  [...balances.values()].reduce((a, b) => a + b, 0);

/* ------------------------------- Transaksi ---------------------------------- */

/** Terbaru di atas; transaksi di hari yang sama diurutkan dari waktu dicatat. */
export const byNewest = (a: FinTransaction, b: FinTransaction) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

export const inMonth = (t: FinTransaction, month: string) => t.date.startsWith(month);

export type MonthSummary = { income: number; expense: number; net: number; count: number };

/** Pemasukan & pengeluaran satu bulan. Transfer antar-akun tidak dihitung. */
export function monthSummary(txs: FinTransaction[], month: string): MonthSummary {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const t of txs) {
    if (!inMonth(t, month)) continue;
    count++;
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
  }
  return { income, expense, net: income - expense, count };
}

export type CashflowPoint = { month: string; income: number; expense: number };

/** Pemasukan vs pengeluaran per bulan, `count` bulan terakhir sampai `endMonth`. */
export function cashflowTrend(txs: FinTransaction[], endMonth: string, count = 6): CashflowPoint[] {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(endMonth, i - count + 1));
  const idx = new Map(months.map((m, i) => [m, i]));
  const out = months.map((month) => ({ month, income: 0, expense: 0 }));
  for (const t of txs) {
    const i = idx.get(t.date.slice(0, 7));
    if (i === undefined) continue;
    if (t.type === "income") out[i]!.income += t.amount;
    else if (t.type === "expense") out[i]!.expense += t.amount;
  }
  return out;
}

export type CategorySlice = {
  categoryId: string | null; // null = tanpa kategori / kategori terhapus / "lainnya" lipatan
  name: string;
  icon: string;
  amount: number;
  share: number; // 0..1 dari total
};

/**
 * Total per kategori untuk satu bulan, terbesar di atas. Kalau kategorinya
 * lebih dari `max`, ekornya dilipat jadi satu baris "Sisanya".
 */
export function categoryBreakdown(
  txs: FinTransaction[],
  categories: FinCategory[],
  month: string,
  type: "income" | "expense" = "expense",
  max = 6,
): CategorySlice[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const sums = new Map<string | null, number>();
  let total = 0;
  for (const t of txs) {
    if (t.type !== type || !inMonth(t, month)) continue;
    const key = t.categoryId && byId.has(t.categoryId) ? t.categoryId : null;
    sums.set(key, (sums.get(key) ?? 0) + t.amount);
    total += t.amount;
  }
  const rows: CategorySlice[] = [...sums.entries()]
    .map(([id, amount]) => {
      const c = id ? byId.get(id) : undefined;
      return {
        categoryId: id,
        name: c?.name ?? "Tanpa kategori",
        icon: c?.icon ?? "more",
        amount,
        share: total ? amount / total : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  if (rows.length <= max) return rows;
  const head = rows.slice(0, max - 1);
  const tail = rows.slice(max - 1);
  const rest = tail.reduce((a, r) => a + r.amount, 0);
  return [
    ...head,
    {
      categoryId: null,
      name: `Sisanya (${tail.length} kategori)`,
      icon: "more",
      amount: rest,
      share: total ? rest / total : 0,
    },
  ];
}

/* -------------------------------- Anggaran ---------------------------------- */

/** Batas kategori yang berlaku di `month` (baris terbaru yang ≤ bulan itu); 0 = tidak ada. */
export function budgetFor(budgets: FinBudget[], categoryId: string, month: string): number {
  let best: FinBudget | undefined;
  for (const b of budgets) {
    if (b.categoryId !== categoryId || b.month > month) continue;
    if (!best || b.month > best.month) best = b;
  }
  return best?.monthlyLimit ?? 0;
}

export type BudgetLine = {
  category: FinCategory;
  limit: number;
  spent: number;
  remaining: number;
  ratio: number; // spent / limit
};

export type BudgetSummary = {
  lines: BudgetLine[]; // paling mepet di atas
  limit: number;
  spent: number;
  remaining: number;
};

/** Anggaran semua kategori pengeluaran yang punya batas di bulan itu. */
export function budgetSummary(
  budgets: FinBudget[],
  categories: FinCategory[],
  txs: FinTransaction[],
  month: string,
): BudgetSummary {
  const spentBy = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense" || !t.categoryId || !inMonth(t, month)) continue;
    spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount);
  }
  const lines: BudgetLine[] = [];
  for (const category of categories) {
    if (category.type !== "expense") continue;
    const limit = budgetFor(budgets, category.id, month);
    if (limit <= 0) continue;
    const spent = spentBy.get(category.id) ?? 0;
    lines.push({ category, limit, spent, remaining: limit - spent, ratio: spent / limit });
  }
  lines.sort((a, b) => b.ratio - a.ratio);
  const limit = lines.reduce((a, l) => a + l.limit, 0);
  const spent = lines.reduce((a, l) => a + l.spent, 0);
  return { lines, limit, spent, remaining: limit - spent };
}

/* ------------------------------ Validasi form -------------------------------- */

export type TxDraft = {
  type: FinTxType;
  amount: string; // digit saja
  date: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  description: string;
};

export type TxErrors = Partial<
  Record<"amount" | "date" | "accountId" | "toAccountId" | "categoryId", string>
>;

export function validateTx(
  d: TxDraft,
  accounts: FinAccount[],
  categories: FinCategory[],
): TxErrors {
  const e: TxErrors = {};
  const ids = new Set(accounts.map((a) => a.id));
  if (!Number(d.amount)) e.amount = "Isi jumlahnya dulu.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) e.date = "Tanggalnya belum valid.";
  if (!ids.has(d.accountId)) e.accountId = "Pilih akunnya.";
  if (d.type === "transfer") {
    if (!ids.has(d.toAccountId)) e.toAccountId = "Pilih akun tujuan.";
    else if (d.toAccountId === d.accountId) e.toAccountId = "Akun tujuan harus beda.";
  } else {
    const cat = categories.find((c) => c.id === d.categoryId);
    if (!cat || cat.type !== d.type) e.categoryId = "Pilih kategorinya.";
  }
  return e;
}

/** Draf form → data transaksi yang siap disimpan (field yang tidak relevan dibuang). */
export function draftToTx(d: TxDraft): Omit<FinTransaction, "id" | "createdAt"> {
  const transfer = d.type === "transfer";
  return {
    type: d.type,
    amount: Number(d.amount),
    date: d.date,
    accountId: d.accountId,
    toAccountId: transfer ? d.toAccountId : undefined,
    categoryId: transfer ? undefined : d.categoryId,
    description: d.description.trim() || undefined,
  };
}
