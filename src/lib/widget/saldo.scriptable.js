// Widget Saldo — Rayhan Life OS (untuk app Scriptable di iPhone)
//
// Dibuat otomatis dari tab Akun di app. Skrip ini berisi alamat & kunci akses
// data cloud-mu — JANGAN dibagikan ke orang lain.
//
// Parameter widget (tahan widget → Edit Widget → Parameter):
//   privat  → nominal disamarkan (disarankan untuk lock screen)

const CONFIG = {
  supabaseUrl: "__SUPABASE_URL__",
  anonKey: "__ANON_KEY__",
  rowId: "__ROW_ID__",
  appUrl: "__APP_URL__",
};

const COLORS = {
  bgTop: new Color("#12333a"),
  bgBottom: new Color("#0a1c22"),
  text: new Color("#eef6f6"),
  muted: new Color("#8fa9ad"),
  income: new Color("#2bc3ba"),
  expense: new Color("#e8796c"),
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const fm = FileManager.local();
const CACHE = fm.joinPath(fm.documentsDirectory(), "rayhan-saldo-cache.json");
const privat = String(args.widgetParameter || "")
  .toLowerCase()
  .includes("privat");

/* ---------------------------------- Format ---------------------------------- */

const group = (n) => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const sign = (n) => (n < 0 ? "−" : "");

/** "Rp 56.600.000" */
function full(n) {
  return privat ? "Rp •••" : sign(n) + "Rp " + group(n);
}

/** "56,6 jt" — untuk ruang sempit. */
function short(n) {
  if (privat) return "•••";
  const a = Math.abs(n);
  const one = (x) => (Math.round(x * 10) / 10).toString().replace(".", ",");
  let s;
  if (a >= 1e9) s = one(a / 1e9) + " M";
  else if (a >= 1e6) s = one(a / 1e6) + " jt";
  else if (a >= 1e3) s = Math.round(a / 1e3) + " rb";
  else s = String(Math.round(a));
  return sign(n) + s;
}

function stamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hm = String(d.getHours()).padStart(2, "0") + "." + String(d.getMinutes()).padStart(2, "0");
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? hm : d.getDate() + " " + MONTHS[d.getMonth()] + " " + hm;
}

/** Bulan berjalan; hari baru mulai jam 3 pagi, sama seperti di app. */
function currentMonth() {
  const d = new Date();
  if (d.getHours() < 3) d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

/* ---------------------------------- Data ----------------------------------- */

/** Rumus yang sama dengan accountBalances() di app: saldo awal + semua transaksi. */
function summarize(accounts, txs) {
  const bal = new Map();
  for (const a of accounts) bal.set(a.id, Number(a.openingBalance) || 0);
  const add = (id, d) => {
    if (bal.has(id)) bal.set(id, bal.get(id) + d);
  };
  const month = currentMonth();
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") add(t.accountId, amt);
    else if (t.type === "expense") add(t.accountId, -amt);
    else if (t.type === "transfer") {
      add(t.accountId, -amt);
      if (t.toAccountId) add(t.toAccountId, amt);
    }
    if (typeof t.date === "string" && t.date.startsWith(month)) {
      if (t.type === "income") income += amt;
      else if (t.type === "expense") expense += amt;
    }
  }
  const list = accounts
    .map((a) => ({ name: String(a.name || "Akun"), balance: bal.get(a.id) || 0 }))
    .sort((x, y) => y.balance - x.balance);
  return {
    total: list.reduce((s, a) => s + a.balance, 0),
    accounts: list,
    income,
    expense,
  };
}

async function fetchSummary() {
  const url =
    CONFIG.supabaseUrl +
    "/rest/v1/app_state?id=eq." +
    encodeURIComponent(CONFIG.rowId) +
    "&select=accounts:data->finAccounts,txs:data->finTransactions,updated_at";
  const req = new Request(url);
  req.headers = { apikey: CONFIG.anonKey, Authorization: "Bearer " + CONFIG.anonKey };
  req.timeoutInterval = 15;
  const rows = await req.loadJSON();
  const status = req.response && req.response.statusCode;
  if (status && status >= 400) throw new Error("HTTP " + status);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("Data cloud tidak ditemukan");
  const accounts = Array.isArray(row.accounts) ? row.accounts : [];
  const txs = Array.isArray(row.txs) ? row.txs : [];
  return { ...summarize(accounts, txs), updatedAt: row.updated_at };
}

/** Ambil data terbaru; kalau gagal (offline), pakai hasil terakhir yang tersimpan. */
async function load() {
  try {
    const data = await fetchSummary();
    fm.writeString(CACHE, JSON.stringify(data));
    return { data, stale: false };
  } catch (e) {
    if (fm.fileExists(CACHE)) {
      try {
        return { data: JSON.parse(fm.readString(CACHE)), stale: true };
      } catch (_) {
        // cache rusak — anggap tidak ada
      }
    }
    return { data: null, stale: true, error: String(e && e.message ? e.message : e) };
  }
}

/* -------------------------------- Tampilan --------------------------------- */

function text(stack, value, size, color, opts = {}) {
  const t = stack.addText(value);
  t.font = opts.bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  if (color) t.textColor = color;
  t.lineLimit = 1;
  t.minimumScaleFactor = opts.scale || 0.6;
  return t;
}

function homeBackground(w) {
  const g = new LinearGradient();
  g.colors = [COLORS.bgTop, COLORS.bgBottom];
  g.locations = [0, 1];
  w.backgroundGradient = g;
}

function footer(stack, data, stale) {
  const when = stamp(data.updatedAt);
  text(stack, (stale ? "offline · " : "") + (when ? "per " + when : ""), 10, COLORS.muted);
}

function accountRows(stack, accounts, max) {
  for (const a of accounts.slice(0, max)) {
    const row = stack.addStack();
    row.centerAlignContent();
    text(row, a.name, 12, COLORS.muted);
    row.addSpacer();
    text(row, privat ? "•••" : short(a.balance), 12, a.balance < 0 ? COLORS.expense : COLORS.text, {
      bold: true,
    });
    stack.addSpacer(3);
  }
}

function buildHome(w, family, data, stale) {
  homeBackground(w);
  w.setPadding(14, 14, 12, 14);

  if (family === "medium") {
    const row = w.addStack();
    const left = row.addStack();
    left.layoutVertically();
    text(left, "KEKAYAAN BERSIH", 9, COLORS.muted, { bold: true });
    left.addSpacer(4);
    text(left, full(data.total), 22, data.total < 0 ? COLORS.expense : COLORS.text, {
      bold: true,
      scale: 0.5,
    });
    left.addSpacer();
    footer(left, data, stale);
    row.addSpacer(14);
    const right = row.addStack();
    right.layoutVertically();
    right.size = new Size(130, 0);
    accountRows(right, data.accounts, 4);
    return;
  }

  text(w, "KEKAYAAN BERSIH", 9, COLORS.muted, { bold: true });
  w.addSpacer(4);
  text(
    w,
    full(data.total),
    family === "small" ? 20 : 30,
    data.total < 0 ? COLORS.expense : COLORS.text,
    {
      bold: true,
      scale: 0.45,
    },
  );

  if (family !== "small") {
    w.addSpacer(10);
    const flow = w.addStack();
    text(flow, "Bulan ini  ", 12, COLORS.muted);
    text(flow, "+" + short(data.income), 12, COLORS.income, { bold: true });
    text(flow, "  −" + short(data.expense), 12, COLORS.expense, { bold: true });
    w.addSpacer(12);
    accountRows(w, data.accounts, 7);
  } else {
    w.addSpacer(6);
    text(w, data.accounts.length + " akun", 11, COLORS.muted);
  }

  w.addSpacer();
  footer(w, data, stale);
}

function buildLock(w, family, data) {
  // Widget lock screen diwarnai sistem — cukup teks, tanpa warna & latar.
  if (family === "accessoryInline") {
    w.addText("Saldo " + (privat ? "Rp •••" : "Rp " + short(data.total)));
    return;
  }
  if (family === "accessoryCircular") {
    w.addSpacer();
    const a = w.addText("Rp");
    a.font = Font.systemFont(10);
    a.centerAlignText();
    const b = w.addText(short(data.total));
    b.font = Font.boldSystemFont(14);
    b.minimumScaleFactor = 0.5;
    b.lineLimit = 1;
    b.centerAlignText();
    w.addSpacer();
    return;
  }
  // accessoryRectangular
  text(w, "Kekayaan bersih", 12, null);
  text(w, full(data.total), 17, null, { bold: true, scale: 0.5 });
  const when = stamp(data.updatedAt);
  if (when) text(w, "per " + when, 11, null);
}

function buildMessage(w, family, title, hint) {
  if (family.startsWith("accessory")) {
    w.addText(family === "accessoryInline" ? "Saldo: " + title : title);
    return;
  }
  homeBackground(w);
  text(w, title, 14, COLORS.text, { bold: true });
  w.addSpacer(4);
  const t = w.addText(hint);
  t.font = Font.systemFont(11);
  t.textColor = COLORS.muted;
}

async function main() {
  const family = config.widgetFamily || "medium";
  const w = new ListWidget();
  w.url = CONFIG.appUrl + "/finance?tab=akun";
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  const { data, stale } = await load();
  if (!data) {
    buildMessage(w, family, "Saldo belum bisa dimuat", "Cek koneksi, lalu buka app sekali.");
  } else if (data.accounts.length === 0) {
    buildMessage(w, family, "Belum ada akun", "Tambahkan akun di tab Keuangan → Akun.");
  } else if (family.startsWith("accessory")) {
    buildLock(w, family, data);
  } else {
    buildHome(w, family, data, stale);
  }

  if (config.runsInWidget) Script.setWidget(w);
  else await w.presentMedium();
  Script.complete();
}

await main();
