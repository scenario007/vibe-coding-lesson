export type UsageEvent = {
  id: string
  userId: string
  model: string
  status: 'reserved' | 'measured' | 'unconfirmed'
  inputTokens: number | null
  outputTokens: number | null
  cachedTokens: number | null
  reservedCny: number
  estimatedCny: number | null
  requestId: string | null
  createdAt: number
}
export type AssetUsage = {
  name: string
  model: string
  status: 'pending' | 'succeeded' | 'unconfirmed'
  tokens: number | null
  estimatedCny: number
}
export type UsageReport = {
  budgetCny: number
  textEstimatedCny: number
  textHeldCny: number
  assetEstimatedCny: number
  assetHeldCny: number
  remainingCny: number
  measuredTokens: number
  events: UsageEvent[]
  assets: AssetUsage[]
  billingConnected: boolean
  rateVerifiedAt: string
  serverNow: number
}
