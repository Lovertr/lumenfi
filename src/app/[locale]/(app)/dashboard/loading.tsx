export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-4 pt-6 lg:pt-10">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
      </div>

      {/* Top discovery row */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-20 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-20 animate-pulse rounded-xl bg-muted/60" />
      </div>

      {/* Hero card */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-44 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
          <div className="h-20 animate-pulse rounded-xl bg-muted/60" />
          <div className="h-20 animate-pulse rounded-xl bg-muted/60" />
        </div>
      </div>

      {/* AI Advisor entry */}
      <div className="h-20 animate-pulse rounded-2xl bg-muted/60" />

      {/* Charts */}
      <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
    </div>
  );
}
