import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
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
  X,
} from "lucide-react";

const primary = [
  { to: "/",         label: "Beranda",   icon: Home },
  { to: "/habits",   label: "Kebiasaan", icon: CheckCircle2 },
  { to: "/goals",    label: "Tujuan",    icon: Target },
  { to: "/calendar", label: "Kalender",  icon: CalendarDays },
  { to: "/profile",  label: "Profil",    icon: User },
] as const;

const extras = [
  { to: "/journal",      label: "Jurnal",     icon: BookOpen,  desc: "Catat mood, syukur, & refleksi hari ini." },
  { to: "/analytics",    label: "Analitik",   icon: BarChart3, desc: "Ritme, konsistensi, dan angka bulan ini." },
  { to: "/achievements", label: "Pencapaian", icon: Award,     desc: "Tonggak-tonggak kecil yang kamu kumpulkan." },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [path]);

  return (
    <div className="min-h-screen text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-hairline bg-canvas/50 backdrop-blur-2xl md:flex">
        <div className="px-7 pb-8 pt-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] font-serif text-lg text-canvas shadow-[0_8px_24px_-8px_oklch(0.62_0.11_195/0.6)]">
              A
            </div>
            <span className="font-serif text-2xl tracking-tight">Aura</span>
          </Link>
          <p className="mt-2 pl-11 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Sistem Diri
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

        <div className="p-4">
          <div className="card-cinema p-4">
            <p className="font-serif text-lg italic leading-snug text-foreground/90">
              "Langkah kecil yang tenang, perlahan menjadi bentuk sebuah hidup."
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="md:pl-60">
        <div className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-32 pt-8 md:px-10 md:pt-12">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2 items-center justify-around rounded-full bg-surface/70 px-2 py-2 shadow-[0_16px_48px_-12px_oklch(0_0_0/0.7)] backdrop-blur-2xl hairline md:hidden">
        {primary.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavPill key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
        ))}
        <button
          onClick={() => setMenu(true)}
          className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] text-canvas shadow-[0_0_28px_-4px_oklch(0.62_0.11_195/0.55)] transition-transform active:scale-95"
          aria-label="Menu lainnya"
        >
          <LayoutGrid className="size-5" strokeWidth={2.25} />
        </button>
        {primary.slice(2, 4).map(({ to, label, icon: Icon }) => (
          <NavPill key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
        ))}
      </nav>

      {/* Mobile "more" sheet — full feature access */}
      {menu && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-md md:hidden"
          onClick={() => setMenu(false)}
        >
          <div
            className="w-full rounded-t-[32px] card-cinema animate-rise p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/15" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Semua fitur</p>
                <h3 className="font-serif text-2xl">Jelajah Aura</h3>
              </div>
              <button
                onClick={() => setMenu(false)}
                className="grid size-9 place-items-center rounded-full bg-black/[0.05] hairline"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[...primary, ...extras].map(({ to, label, icon: Icon, ...rest }) => (
                <Link
                  key={to}
                  to={to}
                  className={[
                    "flex flex-col gap-2 rounded-2xl p-4 text-left transition",
                    isActive(to)
                      ? "bg-gradient-to-br from-[oklch(0.94_0.03_195)] to-[oklch(0.18_0.02_60)] hairline-gold"
                      : "bg-black/[0.03] hairline hover:bg-black/[0.06]",
                  ].join(" ")}
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-black/[0.04]">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    {"desc" in rest && (
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {(rest as { desc: string }).desc}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
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
        "flex flex-1 flex-col items-center gap-1 rounded-full py-2 transition-colors",
        active ? "text-gold" : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
      aria-label={label}
    >
      <Icon className="size-5" />
      <span className="text-[10px] tracking-wide">{label}</span>
    </Link>
  );
}