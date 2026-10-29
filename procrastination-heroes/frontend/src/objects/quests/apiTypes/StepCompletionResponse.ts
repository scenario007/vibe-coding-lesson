import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
export interface StepCompletionResponse {
  detail: QuestDetail
  alreadyCompleted: boolean
  rewardUnlocked: boolean
}
