import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { todayKey, useHydrated, useStore } from "@/lib/store";
import { celebrate, haptic } from "@/lib/celebrate";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Mode Fokus · Rayhan Life OS" },
      {
        name: "description",
        content: "Satu layar penuh berisi jam dan fokus hari ini saja — tanpa distraksi.",
      },
      { property: "og:title", content: "Mode Fokus · Rayhan Life OS" },
      {
        property: "og:description",
        content: "Layar tenang berisi jam besar dan daftar fokus hari ini yang bergerak lembut.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FocusMode,
});

function FocusMode() {
  const hydrated = useHydrated();
  const focusItems = useStore((s) => s.focusItems);
  const toggleFocusItem = useStore((s) => s.toggleFocusItem);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = todayKey();
  const items = hydrated ? focusItems[today] || [] : [];
  const done = items.filter((f) => f.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dayLabel = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Link
        to="/"
        className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-surface/80 text-muted-foreground backdrop-blur hairline transition hover:text-foreground"
        aria-label="Keluar dari mode fokus"
      >
        <X className="size-4" />
      </Link>

      <div className="mb-10 flex flex-col items-center gap-2 text-center">
        <span className="font-sans text-[clamp(3.5rem,16vw,9rem)] font-medium leading-none tabular-nums tracking-tight">
          {hydrated ? `${hh}:${mm}` : "--:--"}
          <span className="ml-2 align-top text-[0.28em] text-muted-foreground tabular-nums">
            {hydrated ? ss : "--"}
          </span>
        </span>
        <span className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
          {hydrated ? dayLabel : "—"}
        </span>
      </div>

      <div className="w-full max-w-md">
        <p className="mb-4 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          <Sparkles className="size-3 text-gold animate-breathe" />
          Fokus hari ini
        </p>

        {items.length === 0 ? (
          <p className="rounded-2xl bg-white/[0.04] p-5 text-center text-sm text-muted-foreground hairline">
            Belum ada fokus untuk hari ini. Tambahkan dulu di{" "}
            <Link to="/" className="text-gold underline-offset-2 hover:underline">
              beranda
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((f, i) => (
              <li key={f.id}>
                <button
                  onClick={() => {
                    toggleFocusItem(today, f.id);
                    haptic();
                    if (!f.done) celebrate("small");
                  }}
                  className="group flex w-full min-w-0 items-center gap-3 rounded-2xl bg-surface/60 px-4 py-3.5 text-left text-base hairline transition hover:bg-surface animate-float-y"
                  style={{ animationDelay: `${i * 0.25}s` }}
                >
                  <span
                    className={[
                      "grid size-6 shrink-0 place-items-center rounded-full transition-all",
                      f.done ? "bg-gold text-white" : "ring-2 ring-white/15 group-hover:ring-gold/60",
                    ].join(" ")}
                  >
                    {f.done && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span
                    className={[
                      "min-w-0 flex-1",
                      f.done ? "text-muted-foreground line-through" : "text-foreground/90",
                    ].join(" ")}
                  >
                    {f.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="mt-8">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {done} dari {items.length} selesai · {pct}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
