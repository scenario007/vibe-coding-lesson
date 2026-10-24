import type { RewardDraft } from '@/objects/economy/RewardDraft'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import type { QuestCategory } from '@/objects/quests/QuestCategory'
import type { QuestId } from '@/objects/quests/QuestId'
import type { RewardTier } from '@/objects/quests/RewardTier'
import type { StageDraft } from '@/objects/quests/StageDraft'
import { APIMessage } from '@/system/api/APIMessage'
export class SaveQuestDraftAPI extends APIMessage<QuestDetail> {
  readonly questId: QuestId
  readonly version: number
  readonly title: string
  readonly category: QuestCategory
  readonly description: string
  readonly dueDate: string | null
  readonly tier: RewardTier
  readonly stages: StageDraft[]
  readonly reward: RewardDraft
  constructor(
    questId: QuestId,
    version: number,
    title: string,
    category: QuestCategory,
    description: string,
    dueDate: string | null,
    tier: RewardTier,
    stages: StageDraft[],
    reward: RewardDraft,
  ) {
    super()
    this.questId = questId
    this.version = version
    this.title = title
    this.category = category
    this.description = description
    this.dueDate = dueDate
    this.tier = tier
    this.stages = stages
    this.reward = reward
  }
}
