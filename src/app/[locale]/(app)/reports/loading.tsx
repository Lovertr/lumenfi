export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pt-6 lg:pt-10">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 animate-pulse rounded bg-muted" />
          <div className="h-3 w-72 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-44 animate-pulse rounded-2xl bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
