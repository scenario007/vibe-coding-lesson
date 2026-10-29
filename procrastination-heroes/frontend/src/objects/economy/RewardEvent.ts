import type { QuestId } from '@/objects/quests/QuestId'
import type { StepId } from '@/objects/quests/StepId'
export interface RewardEvent {
  id: string
  questId: QuestId
  stepId: StepId
  createdAt: number
}
