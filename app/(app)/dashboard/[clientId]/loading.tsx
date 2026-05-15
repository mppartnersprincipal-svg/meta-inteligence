function MetricCardSkeleton() {
  return (
    <div className="relative flex flex-col gap-4 rounded-xl border bg-card p-5 border-l-4 border-l-muted shadow-sm">
      <div className="flex items-start justify-between">
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="h-8 w-32 rounded bg-muted animate-pulse" />
    </div>
  )
}

function MetricSectionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-muted animate-pulse" />
        <div className="h-3 w-40 rounded bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function ChartCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-6 flex flex-col gap-3">
      <div className="h-4 w-48 rounded bg-muted animate-pulse" />
      <div className="h-3 w-32 rounded bg-muted animate-pulse" />
      <div className="mt-2 h-48 w-full rounded-lg bg-muted animate-pulse" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-6 flex flex-col gap-4">
      <div className="h-4 w-36 rounded bg-muted animate-pulse" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="h-3 w-48 rounded bg-muted animate-pulse" />
            <div className="flex gap-6">
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              <div className="h-3 w-12 rounded bg-muted animate-pulse" />
              <div className="h-3 w-8 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ClientDashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-7 w-24 rounded-full bg-muted animate-pulse" />
      </div>

      {/* Account cards */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card px-5 py-4 shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Metric sections */}
      <div className="flex flex-col gap-6">
        <div className="h-3 w-56 rounded bg-muted animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricSectionSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      {/* Table */}
      <TableSkeleton />
    </div>
  )
}
