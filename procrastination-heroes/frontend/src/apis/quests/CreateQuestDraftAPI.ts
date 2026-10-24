import type { JobId } from '@/objects/ai/JobId'
import type { RewardDraft } from '@/objects/economy/RewardDraft'
import type { QuestCategory } from '@/objects/quests/QuestCategory'
import type { RewardTier } from '@/objects/quests/RewardTier'
import type { StageDraft } from '@/objects/quests/StageDraft'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import { APIMessage } from '@/system/api/APIMessage'
export class CreateQuestDraftAPI extends APIMessage<QuestDetail> {
  readonly title: string
  readonly category: QuestCategory
  readonly description: string
  readonly dueDate: string | null
  readonly tier: RewardTier
  readonly stages: StageDraft[]
  readonly reward: RewardDraft
  readonly jobId: JobId | null
  constructor(
    title: string,
    category: QuestCategory,
    description: string,
    dueDate: string | null,
    tier: RewardTier,
    stages: StageDraft[],
    reward: RewardDraft,
    jobId: JobId | null,
  ) {
    super()
    this.title = title
    this.category = category
    this.description = description
    this.dueDate = dueDate
    this.tier = tier
    this.stages = stages
    this.reward = reward
    this.jobId = jobId
  }
}
