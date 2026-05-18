export default function AssistantLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-28 rounded bg-muted/60" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="h-20 rounded-lg border bg-muted/30" />
        <div className="h-32 rounded-lg border bg-muted/30" />
        <div className="h-24 rounded-lg border bg-muted/30" />
      </div>

      <div className="mt-auto h-12 rounded-lg border bg-muted/30" />
    </div>
  )
}
