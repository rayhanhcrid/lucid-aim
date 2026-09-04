import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Sparkles, Wind } from "lucide-react";
import { useHydrated, useStore, useToday } from "@/lib/store";
import { celebrate, haptic } from "@/lib/celebrate";
import { useBreath } from "@/lib/breath";
import { SoundControl } from "@/components/SoundControl";
import { chime } from "@/lib/soundscape";

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
  const [breathing, setBreathing] = useState(false);
  const { phase, cycles } = useBreath(breathing);

  useEffect(() => {
    // Di layar ini detiknya kelihatan, jadi tick-nya per detik — bukan per 15 detik.
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Motion latar dibikin lebih lambat & organik selama di Mode Fokus.
  useEffect(() => {
    document.documentElement.classList.add("calm-motion");
    return () => document.documentElement.classList.remove("calm-motion");
  }, []);

  const today = useToday();
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
      {/* Halo di belakang jam. Kalau panduan napas nyala, halo ini yang jadi
          penuntunnya — mengembang pas tarik napas, mengempis pas buang. */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute left-1/2 top-[30%] -z-10 size-[min(78vw,34rem)] -translate-x-1/2 -translate-y-1/2 blur-3xl",
          breathing ? "breath-orb" : "rounded-full animate-breathe",
        ].join(" ")}
        style={
          breathing
            ? ({
                "--breath-dur": `${phase.ms}ms`,
                transform: `translate(-50%, -50%) scale(${phase.scale})`,
              } as React.CSSProperties)
            : {
                background:
                  "radial-gradient(circle, oklch(0.62 0.11 var(--acc-h1) / 0.22) 0%, oklch(0.62 0.11 var(--acc-h1) / 0.06) 45%, transparent 70%)",
                animationDuration: "16s",
              }
        }
      />
      {/* Cincin tipis yang ikut napas — patokan visual yang lebih tegas dari kabut. */}
      {breathing && (
        <div
          aria-hidden="true"
          className="breath-ring pointer-events-none absolute left-1/2 top-[30%] -z-10 size-[min(52vw,22rem)] -translate-x-1/2 -translate-y-1/2"
          style={
            {
              "--breath-dur": `${phase.ms}ms`,
              transform: `translate(-50%, -50%) scale(${phase.scale})`,
            } as React.CSSProperties
          }
        />
      )}

      <Link
        to="/"
        onClick={() => haptic()}
        className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-surface/80 text-muted-foreground backdrop-blur hairline transition hover:text-foreground"
        aria-label="Keluar dari mode fokus"
      >
        <X className="size-4" />
      </Link>

      <div className="animate-rise mb-10 flex flex-col items-center gap-2 text-center">
        <span className="font-sans text-[clamp(3.5rem,16vw,9rem)] font-medium leading-none tabular-live tracking-tight">
          {hydrated ? `${hh}:${mm}` : "--:--"}
          {hydrated && (
            <span className="align-top text-[0.28em] font-normal text-muted-foreground">{ss}</span>
          )}
        </span>
        <span className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
          {hydrated ? dayLabel : "—"}
        </span>

        {breathing && (
          <div className="mt-6 flex flex-col items-center gap-1">
            <span
              key={phase.key}
              className="animate-rise font-serif text-2xl italic text-gold"
            >
              {phase.label}
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {cycles > 0 ? `${cycles} putaran` : "ikuti lingkarannya"}
            </span>
          </div>
        )}
      </div>

      <div className="w-full max-w-md">
        <p className="mb-4 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          <Sparkles className="size-3 text-gold animate-breathe" />
          Fokus hari ini
        </p>

        {items.length === 0 ? (
          <p className="animate-rise rounded-2xl bg-white/[0.04] p-5 text-center text-sm text-muted-foreground hairline">
            Belum ada fokus untuk hari ini.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((f, i) => (
              <li
                key={f.id}
                className="animate-rise"
                style={{ animationDelay: `${0.08 + i * 0.07}s` }}
              >
                <button
                  onClick={() => {
                    toggleFocusItem(today, f.id);
                    if (f.done) {
                      haptic(8);
                    } else {
                      haptic([10, 40, 18]);
                      celebrate("small");
                      // Nada penutupnya naik kalau ini item terakhir.
                      chime(done + 1 === items.length ? 7 : 0);
                    }
                  }}
                  className={[
                    "group relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left text-base backdrop-blur hairline spotlight",
                    "transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-surface hover:shadow-[0_18px_38px_-24px_oklch(0.62_0.11_var(--acc-h1)/0.7)] active:scale-[0.985]",
                    f.done ? "bg-surface/35 opacity-70" : "bg-surface/60 animate-float-y",
                  ].join(" ")}
                  style={{
                    animationDelay: `${i * 0.45}s`,
                    animationDuration: `${4.2 + (i % 3) * 0.9}s`,
                  }}
                >
                  <span
                    key={f.done ? "on" : "off"}
                    className={[
                      "grid size-6 shrink-0 place-items-center rounded-full transition-all",
                      f.done
                        ? "bg-gold text-white animate-check-pop"
                        : "ring-2 ring-white/15 transition-transform group-hover:scale-110 group-hover:ring-gold/60",
                    ].join(" ")}
                  >
                    {f.done && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span
                    className={[
                      "min-w-0 flex-1 transition-colors duration-500",
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
          <div className="animate-rise mt-8" style={{ animationDelay: "0.3s" }}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {done} dari {items.length} selesai · {pct}%
            </p>
          </div>
        )}
      </div>

      {/* Kendali suasana: napas & suara latar. Ditaruh di bawah biar nggak ikut
          jadi tontonan pas lagi fokus. */}
      <div className="animate-rise mt-12 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: "0.4s" }}>
        <button
          onClick={() => {
            haptic(10);
            setBreathing((v) => !v);
          }}
          className={[
            "flex items-center gap-2 rounded-full px-3.5 py-2 text-xs backdrop-blur transition",
            breathing
              ? "bg-surface/80 text-gold hairline-gold"
              : "bg-surface/70 text-muted-foreground hairline hover:text-foreground",
          ].join(" ")}
          aria-pressed={breathing}
        >
          <Wind className="size-3.5" />
          {breathing ? "Berhenti menuntun" : "Panduan napas"}
        </button>
        <SoundControl />
      </div>
    </div>
  );
}
