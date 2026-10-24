import type { RewardDesign } from '@/objects/economy/RewardDesign'
import type { QuestRecord } from '@/objects/quests/QuestRecord'
import type { QuestStep } from '@/objects/quests/QuestStep'
export interface QuestDetail {
  quest: QuestRecord
  steps: QuestStep[]
  reward: RewardDesign
}
