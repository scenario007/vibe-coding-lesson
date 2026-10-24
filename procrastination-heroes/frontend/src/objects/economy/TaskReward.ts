import type { RewardDesign } from '@/objects/economy/RewardDesign'
import type { QuestId } from '@/objects/quests/QuestId'
export interface TaskReward {
  id: string
  questId: QuestId
  design: RewardDesign
  unlockedAt: number
}
