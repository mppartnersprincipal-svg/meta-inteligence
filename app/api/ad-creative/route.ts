import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import { GRAPH_API } from '@/lib/meta-config'

function decodeHtml(str: string): string {
  return str.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function extractIframeSrc(html: string | undefined): string | null {
  if (!html) return null
  const match = html.match(/src="([^"]+)"/)
  return match ? decodeHtml(match[1]) : null
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const adId = searchParams.get('adId')
  const clientId = searchParams.get('clientId')

  if (!adId || !clientId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: bmToken } = await supabase
    .from('bm_tokens')
    .select('meta_tokens!inner(token_encrypted, is_valid)')
    .eq('client_id', clientId)
    .single()

  const metaToken = bmToken
    ? (Array.isArray(bmToken.meta_tokens) ? bmToken.meta_tokens[0] : bmToken.meta_tokens)
    : null

  if (!metaToken?.is_valid || !metaToken.token_encrypted) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  const token = decryptToken(metaToken.token_encrypted as string)
  const headers = { Authorization: `Bearer ${token}` }

  // Fetch ad preview iframe + creative text in parallel
  const [previewRes, creativeRes] = await Promise.all([
    fetch(
      `${GRAPH_API}/${adId}/previews?ad_format=MOBILE_FEED_STANDARD`,
      { headers, signal: AbortSignal.timeout(8000) }
    ),
    fetch(
      `${GRAPH_API}/${adId}?fields=creative{body,title,description,call_to_action_type}`,
      { headers, signal: AbortSignal.timeout(8000) }
    ),
  ])

  const [previewData, creativeData] = await Promise.all([
    previewRes.json() as Promise<{ data?: { body?: string }[] }>,
    creativeRes.json() as Promise<{ creative?: { body?: string; title?: string; description?: string; call_to_action_type?: string } }>,
  ])

  const iframeSrc = extractIframeSrc(previewData.data?.[0]?.body)
  const creative = creativeData.creative ?? {}

  return NextResponse.json({
    iframeSrc,
    body: creative.body ?? null,
    title: creative.title ?? null,
    description: creative.description ?? null,
    callToAction: creative.call_to_action_type ?? null,
  })
}
