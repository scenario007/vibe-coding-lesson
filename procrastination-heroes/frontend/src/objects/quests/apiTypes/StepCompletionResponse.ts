import type { PlayerProgress } from '@/objects/economy/PlayerProgress'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
export interface StepCompletionResponse {
  detail: QuestDetail
  progress: PlayerProgress
  awardedCoins: number
  alreadyCompleted: boolean
  rewardUnlocked: boolean
}
