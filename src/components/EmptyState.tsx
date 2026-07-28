import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-cinema animate-rise flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195/0.18)] to-transparent text-gold">
        <span className="absolute inset-0 rounded-full bg-gold/10 animate-breathe" />
        <Icon className="relative size-7" strokeWidth={1.5} />
      </span>
      <h3 className="font-serif text-2xl leading-tight">{title}</h3>
      <p className="max-w-[36ch] text-pretty text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}