import { describe, expect, it } from 'vitest'
import { executeToolCall, type ToolContext } from './tools'

const ctx: ToolContext = {
  token: 'FAKE_TOKEN_NEVER_HIT',
  accountIds: ['act_allowed_1', 'act_allowed_2'],
}

describe('executeToolCall — trust boundary', () => {
  it('rejects get_campaign_detail when account_id is not in the allowed list', async () => {
    const raw = await executeToolCall(
      'get_campaign_detail',
      { campaign_id: '999', account_id: 'act_someone_elses' },
      ctx
    )
    const parsed = JSON.parse(raw)
    expect(parsed.error).toMatch(/não pertence a este cliente/)
  })

  it('rejects get_campaign_ads when account_id is not allowed', async () => {
    const raw = await executeToolCall(
      'get_campaign_ads',
      { campaign_id: '999', account_id: 'act_intruder' },
      ctx
    )
    expect(JSON.parse(raw).error).toMatch(/não pertence/)
  })

  it('rejects get_campaign_detail when campaign_id is missing', async () => {
    const raw = await executeToolCall(
      'get_campaign_detail',
      { account_id: 'act_allowed_1' },
      ctx
    )
    expect(JSON.parse(raw).error).toMatch(/campaign_id/)
  })

  it('rejects get_account_daily_spend when account_id is missing', async () => {
    const raw = await executeToolCall('get_account_daily_spend', {}, ctx)
    expect(JSON.parse(raw).error).toMatch(/account_id/)
  })

  it('returns an error JSON for unknown tool names', async () => {
    const raw = await executeToolCall('not_a_real_tool', {}, ctx)
    const parsed = JSON.parse(raw)
    expect(parsed.error).toBeDefined()
  })
})
