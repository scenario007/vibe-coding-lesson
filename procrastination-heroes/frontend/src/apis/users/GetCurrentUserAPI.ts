import type { UserProfile } from '@/objects/users/UserProfile'
import { APIMessage } from '@/system/api/APIMessage'
export class GetCurrentUserAPI extends APIMessage<UserProfile> {
  constructor() {
    super()
  }
}
