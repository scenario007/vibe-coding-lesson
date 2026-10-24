import type { DayActivity } from '@/objects/adventure/apiTypes/DayActivity'
import type { PlayerProgress } from '@/objects/economy/PlayerProgress'
import type { TaskReward } from '@/objects/economy/TaskReward'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import type { UserProfile } from '@/objects/users/UserProfile'
export interface DashboardResponse {
  user: UserProfile
  progress: PlayerProgress
  quests: QuestDetail[]
  completedCount: number
  todaySteps: number
  focusSeconds: number
  week: DayActivity[]
  rewards: TaskReward[]
}
