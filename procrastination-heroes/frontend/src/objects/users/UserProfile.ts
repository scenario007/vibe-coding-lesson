import type { UserId } from '@/objects/users/UserId'
import type { UserAvatar } from './UserAvatar'
export interface UserProfile {
  id: UserId
  username: string
  nickname: string
  avatar: UserAvatar
  dailyGoal: number
  focusMinutes: number
  createdAt: number
}
