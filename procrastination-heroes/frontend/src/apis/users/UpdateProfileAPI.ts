import type { UserAvatar } from '@/objects/users/UserAvatar'
import type { UserProfile } from '@/objects/users/UserProfile'
import { APIMessage } from '@/system/api/APIMessage'
export class UpdateProfileAPI extends APIMessage<UserProfile> {
  readonly nickname: string
  readonly avatar: UserAvatar
  readonly dailyGoal: number
  readonly focusMinutes: number
  constructor(nickname: string, avatar: UserAvatar, dailyGoal: number, focusMinutes: number) {
    super()
    this.nickname = nickname
    this.avatar = avatar
    this.dailyGoal = dailyGoal
    this.focusMinutes = focusMinutes
  }
}
