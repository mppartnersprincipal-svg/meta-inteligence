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

export default function CampaignDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb extension */}
      <div className="flex items-center gap-2 -mt-4">
        <div className="h-3 w-3 rounded bg-muted animate-pulse" />
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        <div className="h-3 w-3 rounded bg-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="h-3 w-36 rounded bg-muted animate-pulse" />
        </div>
        {/* Date preset filter skeleton */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-16 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>

      {/* Tab nav skeleton */}
      <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>

      {/* Metric sections */}
      <div className="flex flex-col gap-6">
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricSectionSkeleton key={i} />
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border bg-card shadow-sm p-6 flex flex-col gap-3">
        <div className="h-4 w-48 rounded bg-muted animate-pulse" />
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        <div className="mt-2 h-48 w-full rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  )
}
