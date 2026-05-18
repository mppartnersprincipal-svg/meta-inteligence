'use client'

import { useState, useEffect } from 'react'
import { Eye, Loader2, ImageOff } from 'lucide-react'
import type { AdRow } from '@/lib/meta-insights'
import { brl, num } from '@/lib/formatters'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function pct(v: number) {
  return `${v.toFixed(2)}%`
}

const MAX_SPEND_COLOR = 'var(--chart-1)'

interface AdPreview {
  iframeSrc: string | null
  body: string | null
  title: string | null
  description: string | null
  callToAction: string | null
}

interface CreativesTableProps {
  data: AdRow[]
  clientId: string
}

function CreativePreviewBody({
  adId,
  adName,
  clientId,
}: {
  adId: string
  adName: string
  clientId: string
}) {
  const [preview, setPreview] = useState<AdPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/ad-creative?adId=${encodeURIComponent(adId)}&clientId=${encodeURIComponent(clientId)}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Erro ao carregar')
        return data as AdPreview
      })
      .then((data) => {
        if (cancelled) return
        setPreview(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Não foi possível carregar a prévia')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [adId, clientId])

  const hasContent = preview && (preview.iframeSrc || preview.body || preview.title)

  return (
    <div className="mt-1 flex flex-col gap-3">
      {loading && (
        <div className="flex h-52 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex h-52 flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff className="h-8 w-8 opacity-40" />
          <p className="text-sm text-center">{error}</p>
        </div>
      )}

      {!loading && !error && !hasContent && (
        <div className="flex h-52 flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff className="h-8 w-8 opacity-40" />
          <p className="text-sm">Prévia não disponível para este anúncio</p>
        </div>
      )}

      {!loading && !error && hasContent && (
        <>
          {preview.iframeSrc && (
            <div className="overflow-hidden rounded-lg border bg-muted/20">
              <iframe
                src={preview.iframeSrc}
                className="w-full"
                style={{ height: 400, border: 'none' }}
                scrolling="yes"
                title={adName}
              />
            </div>
          )}

          {preview.title && (
            <p className="text-sm font-semibold leading-snug">{preview.title}</p>
          )}
          {preview.body && (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {preview.body}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function CreativePreviewDialog({
  adId,
  adName,
  clientId,
  open,
  onOpenChange,
}: {
  adId: string
  adName: string
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8 truncate">{adName}</DialogTitle>
        </DialogHeader>

        {open && <CreativePreviewBody adId={adId} adName={adName} clientId={clientId} />}
      </DialogContent>
    </Dialog>
  )
}

export function CreativesTable({ data, clientId }: CreativesTableProps) {
  const [previewAd, setPreviewAd] = useState<{ adId: string; adName: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openPreview(adId: string, adName: string) {
    setPreviewAd({ adId, adName })
    setDialogOpen(true)
  }

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sem criativos no período
      </div>
    )
  }

  const maxSpend = Math.max(...data.map((d) => d.spend))

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-xs">
              <th className="pb-2.5 text-left font-medium">Criativo</th>
              <th className="pb-2.5 text-right font-medium">Invest.</th>
              <th className="pb-2.5 text-right font-medium">Alcance</th>
              <th className="pb-2.5 text-right font-medium">Impressões</th>
              <th className="pb-2.5 text-right font-medium">Freq.</th>
              <th className="pb-2.5 text-right font-medium">Cliques</th>
              <th className="pb-2.5 text-right font-medium">Cl. Link</th>
              <th className="pb-2.5 text-right font-medium">CTR</th>
              <th className="pb-2.5 text-right font-medium">CPC</th>
              <th className="pb-2.5 text-right font-medium">Leads</th>
              <th className="pb-2.5 text-right font-medium">Msgs</th>
              <th className="pb-2.5 text-right font-medium">Engaj.</th>
              <th className="pb-2.5 text-right font-medium">Reações</th>
              <th className="pb-2.5 text-right font-medium">Seguid.</th>
              <th className="pb-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const spendPct = maxSpend > 0 ? (row.spend / maxSpend) * 100 : 0
              return (
                <tr key={row.adId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-medium max-w-[220px] truncate" title={row.adName}>
                        {row.adName}
                      </p>
                      <div className="mt-1.5 h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${spendPct}%`,
                            backgroundColor: MAX_SPEND_COLOR,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right tabular-nums font-medium">{brl(row.spend)}</td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">{num(row.reach)}</td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">{num(row.impressions)}</td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">
                    {row.frequency > 0 ? row.frequency.toFixed(1) : '—'}
                  </td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">{num(row.clicks)}</td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">
                    {row.linkClicks > 0 ? num(row.linkClicks) : '—'}
                  </td>
                  <td className="py-3 text-right tabular-nums">{pct(row.ctr)}</td>
                  <td className="py-3 text-right tabular-nums">{row.cpc > 0 ? brl(row.cpc) : '—'}</td>
                  <td className="py-3 text-right tabular-nums">
                    {row.leads > 0 ? num(row.leads) : '—'}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {row.messages > 0 ? num(row.messages) : '—'}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {row.engagements > 0 ? num(row.engagements) : '—'}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {row.reactions > 0 ? num(row.reactions) : '—'}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {row.follows > 0 ? num(row.follows) : '—'}
                  </td>
                  <td className="py-3 pl-2">
                    <button
                      onClick={() => openPreview(row.adId, row.adName)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Ver prévia do criativo"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {previewAd && (
        <CreativePreviewDialog
          adId={previewAd.adId}
          adName={previewAd.adName}
          clientId={clientId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  )
}
