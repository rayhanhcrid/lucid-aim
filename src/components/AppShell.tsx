import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Home,
  CheckCircle2,
  Target,
  CalendarDays,
  User,
  BarChart3,
  BookOpen,
  Award,
  Plus,
} from "lucide-react";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/habits", label: "Habits", icon: CheckCircle2 },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
];

const desktopExtras = [
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/achievements", label: "Achievements", icon: Award },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <div className="min-h-screen bg-canvas text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-hairline bg-canvas/60 backdrop-blur-xl md:flex">
        <div className="px-7 pb-8 pt-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-full bg-foreground text-canvas font-serif text-lg">
              A
            </div>
            <span className="font-serif text-xl tracking-tight">Aura</span>
          </Link>
          <p className="mt-2 pl-10 text-[11px] uppercase tracking-widest text-muted-foreground">
            Life OS
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {[...nav.slice(0, 4), ...desktopExtras, nav[4]].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={[
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                isActive(to)
                  ? "bg-surface text-foreground hairline"
                  : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4">
          <div className="rounded-2xl bg-surface/60 p-4 hairline">
            <p className="font-serif text-lg leading-snug text-foreground">
              "Small steps, taken quietly, become the shape of a life."
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
      <nav className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 items-center justify-around rounded-full bg-surface/80 px-3 py-2.5 shadow-2xl backdrop-blur-xl hairline md:hidden">
        {nav.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavPill key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
        ))}
        <Link
          to="/habits"
          className="grid size-11 place-items-center rounded-full bg-foreground text-canvas shadow-[0_0_24px_rgba(255,255,255,0.12)] transition-transform active:scale-95"
          aria-label="Add"
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </Link>
        {nav.slice(2, 4).map(({ to, label, icon: Icon }) => (
          <NavPill key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
        ))}
      </nav>
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
        "flex flex-col items-center gap-1 rounded-full p-2 transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
      aria-label={label}
    >
      <Icon className="size-5" />
    </Link>
  );
}