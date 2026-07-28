export function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton-block rounded-2xl ${className}`} />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card-cinema p-4">
          <div className="flex items-center gap-3">
            <Shimmer className="size-7 rounded-full" />
            <Shimmer className="size-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3.5 w-2/5" />
              <Shimmer className="h-2.5 w-1/4" />
            </div>
          </div>
          <Shimmer className="mt-4 h-4 w-full rounded-[3px]" />
        </div>
      ))}
    </div>
  );
}