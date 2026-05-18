import { describe, expect, it } from 'vitest'
import { buildSections } from './dashboard-sections'
import type { KPIs } from './meta-insights'

const zero: KPIs = {
  spend: 0,
  reach: 0,
  impressions: 0,
  frequency: 0,
  cpm: 0,
  clicks: 0,
  linkClicks: 0,
  linkCtr: 0,
  cpc: 0,
  leads: 0,
  costPerLead: 0,
  messages: 0,
  costPerMessage: 0,
  postEngagements: 0,
  reactions: 0,
  comments: 0,
  shares: 0,
}

const sample: KPIs = {
  spend: 1234.56,
  reach: 50000,
  impressions: 120000,
  frequency: 2.4,
  cpm: 10.29,
  clicks: 800,
  linkClicks: 600,
  linkCtr: 0.5,
  cpc: 1.54,
  leads: 25,
  costPerLead: 49.38,
  messages: 12,
  costPerMessage: 102.88,
  postEngagements: 9000,
  reactions: 200,
  comments: 50,
  shares: 15,
}

describe('buildSections', () => {
  it('returns exactly 4 sections in the expected order', () => {
    const sections = buildSections(sample)
    expect(sections).toHaveLength(4)
    expect(sections.map((s) => s.title)).toEqual([
      'Alcance & Investimento',
      'Cliques & Tráfego',
      'Resultados',
      'Engajamento',
    ])
  })

  it('assigns one of the four allowed colors per section', () => {
    const colors = buildSections(sample).map((s) => s.color)
    expect(colors).toEqual(['blue', 'green', 'orange', 'purple'])
  })

  it('formats spend as BRL currency', () => {
    const investment = buildSections(sample)[0].metrics[0]
    expect(investment.label).toBe('Investimento')
    expect(investment.value).toMatch(/R\$\s?1\.234,56/)
  })

  it('renders em-dash for leads/CPL/messages when count is zero', () => {
    const results = buildSections(zero)[2]
    const labels = Object.fromEntries(results.metrics.map((m) => [m.label, m.value]))
    expect(labels['Leads']).toBe('—')
    expect(labels['Custo por lead']).toBe('—')
    expect(labels['Conversas iniciadas']).toBe('—')
    expect(labels['Custo por conversa']).toBe('—')
  })

  it('keeps frequency with 2 decimals even when zero', () => {
    const reach = buildSections(zero)[0]
    const freq = reach.metrics.find((m) => m.label === 'Frequência')
    expect(freq?.value).toBe('0.00x')
  })
})
