import type { QuestCategory } from '@/objects/quests/QuestCategory'
import type { QuestId } from '@/objects/quests/QuestId'
import type { QuestStatus } from '@/objects/quests/QuestStatus'
import type { RewardTier } from '@/objects/quests/RewardTier'
import type { UserId } from '@/objects/users/UserId'
export interface QuestRecord {
  id: QuestId
  userId: UserId
  title: string
  category: QuestCategory
  description: string
  dueDate: string | null
  tier: RewardTier
  status: QuestStatus
  archivedFrom: QuestStatus
  version: number
  reflection: string
  createdAt: number
  completedAt: number | null
}
