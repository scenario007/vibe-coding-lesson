import type { RewardDraft } from '@/objects/economy/RewardDraft'
import type { QuestCategory } from '@/objects/quests/QuestCategory'
import type { StageDraft } from '@/objects/quests/StageDraft'
export interface PlanDraft {
  title: string
  category: QuestCategory
  summary: string
  stages: StageDraft[]
  reward: RewardDraft
}
