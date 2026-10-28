import type { RewardPalette } from './RewardPalette'
import type { RewardSymbol } from './RewardSymbol'
export interface RewardDraft {
  name: string
  story: string
  symbol: RewardSymbol
  palette: RewardPalette
  imageUrl?: string | null
}
