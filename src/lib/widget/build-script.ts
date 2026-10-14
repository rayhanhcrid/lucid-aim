import template from "./saldo.scriptable.js?raw";

export type WidgetScriptConfig = {
  supabaseUrl: string;
  anonKey: string;
  rowId: string;
  /** Alamat app yang dibuka saat widget diketuk, mis. https://lucid-aim.vercel.app */
  appUrl: string;
};

/**
 * Skrip Scriptable siap tempel: template saldo.scriptable.js dengan alamat &
 * kunci cloud diisikan. Nilainya di-JSON-kan supaya aman sebagai literal JS.
 */
export function buildWidgetScript(cfg: WidgetScriptConfig): string {
  return template
    .replace('"__SUPABASE_URL__"', JSON.stringify(cfg.supabaseUrl.replace(/\/+$/, "")))
    .replace('"__ANON_KEY__"', JSON.stringify(cfg.anonKey))
    .replace('"__ROW_ID__"', JSON.stringify(cfg.rowId))
    .replace('"__APP_URL__"', JSON.stringify(cfg.appUrl.replace(/\/+$/, "")));
}
