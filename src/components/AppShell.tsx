import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Home,
  CheckCircle2,
  Target,
  CalendarDays,
  User,
  BarChart3,
  BookOpen,
  Award,
  LayoutGrid,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import { SoundControl } from "@/components/SoundControl";

const primary = [
  { to: "/",         label: "Beranda",   icon: Home },
  { to: "/habits",   label: "Kebiasaan", icon: CheckCircle2 },
  { to: "/goals",    label: "Tujuan",    icon: Target },
  { to: "/calendar", label: "Kalender",  icon: CalendarDays },
  { to: "/profile",  label: "Profil",    icon: User },
] as const;

// Mode Fokus sengaja tidak di sini — masuknya lewat kartu fokus di Beranda.
const extras = [
  { to: "/finance",      label: "Keuangan",   icon: Wallet },
  { to: "/review",       label: "Rekap",      icon: Sparkles },
  { to: "/journal",      label: "Jurnal",     icon: BookOpen },
  { to: "/analytics",    label: "Analitik",   icon: BarChart3 },
  { to: "/achievements", label: "Pencapaian", icon: Award },
] as const;

/**
 * @param wide  Dipakai halaman dasbor (beranda) yang isinya jadi dua kolom di
 *              layar besar. Halaman berbasis daftar tetap sempit supaya
 *              barisnya nggak melar sampai selebar layar.
 */
export function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  const [menu, setMenu] = useState(false);
  const dialogOpen = useUIStore((s) => s.dialogOpen);
  useEffect(() => { setMenu(false); }, [path]);
  // Hide the mobile nav overlay while a page dialog (add habit/goal/...) is open —
  // otherwise the fixed nav can sit on top of the dialog's action buttons.
  const hideMobileNav = menu || dialogOpen;

  return (
    <div className="min-h-screen text-foreground">
      <ScrollProgress />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-hairline bg-canvas/50 backdrop-blur-2xl md:flex">
        <div className="px-7 pb-8 pt-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] font-serif text-lg text-white shadow-[0_8px_24px_-8px_oklch(0.62_0.11_var(--acc-h1)/0.6)]">
              R
            </div>
            <span className="font-serif text-2xl tracking-tight">Rayhan</span>
          </Link>
          <p className="mt-2 pl-11 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Life OS
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {[...primary.slice(0, 4), ...extras, primary[4]].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={[
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                isActive(to)
                  ? "bg-surface text-foreground hairline-gold"
                  : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="space-y-3 p-4">
          <SoundControl />
          <div className="card-cinema spotlight p-4">
            <p className="font-serif text-lg italic leading-snug text-foreground/90">
              "Langkah kecil yang tenang, pelan-pelan membentuk hidup yang kamu inginkan."
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="md:pl-60">
        <div
          className={[
            "mx-auto min-h-screen w-full px-5 pb-32 pt-8 md:px-10 md:pt-12",
            wide
              ? "max-w-3xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-[1440px]"
              : "max-w-3xl xl:max-w-4xl",
          ].join(" ")}
        >
          <div key={path} className="route-shift">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav — hidden while a dialog/sheet is open so it never blocks it */}
      {!hideMobileNav && (
        <nav className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2 items-center justify-around rounded-full bg-surface/90 px-2 py-2 shadow-[0_18px_50px_-14px_oklch(0_0_0/0.55)] backdrop-blur-2xl hairline md:hidden">
          {primary.slice(0, 2).map(({ to, label, icon: Icon }) => (
            <NavPill key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
          ))}
          <button
            onClick={() => setMenu(true)}
            className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] text-white shadow-[0_0_28px_-4px_oklch(0.62_0.11_var(--acc-h1)/0.55)] transition-transform active:scale-95"
            aria-label="Menu lainnya"
          >
            <LayoutGrid className="size-5" strokeWidth={2.25} />
          </button>
          {primary.slice(2, 4).map(({ to, label, icon: Icon }) => (
            <NavPill key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
          ))}
        </nav>
      )}

      {/* Mobile "more" sheet — full feature access */}
      {menu && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-md md:hidden"
          onClick={() => setMenu(false)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-[32px] card-cinema animate-rise p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Semua fitur</p>
                <h3 className="font-serif text-2xl">Jelajahi Rayhan</h3>
              </div>
              <button
                onClick={() => setMenu(false)}
                className="grid size-9 place-items-center rounded-full bg-white/[0.06] hairline"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[...primary, ...extras].map(({ to, label, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={[
                      "flex flex-col gap-2 rounded-2xl p-4 text-left transition",
                      active
                        ? "bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] shadow-[0_8px_20px_-8px_oklch(0.62_0.11_var(--acc-h1)/0.5)]"
                        : "bg-white/[0.04] hairline hover:bg-white/[0.07]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid size-9 place-items-center rounded-xl",
                        active ? "bg-white/20 text-white" : "bg-white/[0.06]",
                      ].join(" ")}
                    >
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <p className={["text-sm font-medium", active ? "text-white" : ""].join(" ")}>
                      {label}
                    </p>
                  </Link>
                );
              })}
            </div>
            {/* Ditaruh di bawah grid: panel pilihannya membuka ke atas, jadi nggak
                kepotong sama area scroll sheet-nya. */}
            <div className="mt-4 flex justify-center">
              <SoundControl />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavPill({
  to,
  label,
  Icon,
  active,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={[
        "relative flex flex-1 flex-col items-center gap-1 rounded-full py-2 transition-colors",
        active ? "text-gold" : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
      aria-label={label}
    >
      <Icon className={["size-5 transition-transform", active ? "scale-110" : ""].join(" ")} />
      <span className="text-[10px] tracking-wide">{label}</span>
      {active && <span className="nav-dot" />}
    </Link>
  );
}
/**
 * Garis tipis di paling atas yang ngisi seiring scroll. Kecil, tapi bikin
 * halaman panjang kerasa punya ujung.
 */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 12 ? Math.min(1, window.scrollY / max) : 0;
      el.style.transform = `scaleX(${p.toFixed(4)})`;
      el.style.opacity = p > 0.005 ? "1" : "0";
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-px" aria-hidden="true">
      <div
        ref={ref}
        className="h-full origin-left bg-gradient-to-r from-transparent via-[var(--accent-1)] to-[var(--gold)] opacity-0 transition-opacity duration-300"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
