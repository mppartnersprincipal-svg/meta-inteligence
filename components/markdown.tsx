'use client'

import dynamic from 'next/dynamic'

export const Markdown = dynamic(
  () => import('./markdown-impl').then((m) => m.MarkdownImpl),
  {
    ssr: false,
    loading: () => (
      <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted/40" />
    ),
  }
)
