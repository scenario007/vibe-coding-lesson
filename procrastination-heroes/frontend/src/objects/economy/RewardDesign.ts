import type { QuestId } from '@/objects/quests/QuestId'
import type { RewardPalette } from './RewardPalette'
import type { RewardSymbol } from './RewardSymbol'
export interface RewardDesign {
  id: string
  questId: QuestId
  name: string
  story: string
  symbol: RewardSymbol
  palette: RewardPalette
}
