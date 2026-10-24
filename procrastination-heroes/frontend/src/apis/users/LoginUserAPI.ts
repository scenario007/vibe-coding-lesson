import type { AuthResponse } from '@/objects/users/apiTypes/AuthResponse'
import { APIMessage } from '@/system/api/APIMessage'
export class LoginUserAPI extends APIMessage<AuthResponse> {
  override get authenticated() {
    return false
  }
  readonly username: string
  readonly password: string
  constructor(username: string, password: string) {
    super()
    this.username = username
    this.password = password
  }
}
