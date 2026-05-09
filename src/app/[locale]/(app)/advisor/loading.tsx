export default function AdvisorLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-3 w-56 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-12 animate-pulse rounded-lg bg-muted/40" />
      <div className="h-36 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
