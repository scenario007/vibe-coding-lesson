import type { AuthResponse } from '@/objects/users/apiTypes/AuthResponse'
import { APIMessage } from '@/system/api/APIMessage'
export class RegisterUserAPI extends APIMessage<AuthResponse> {
  override get authenticated() {
    return false
  }
  readonly username: string
  readonly password: string
  readonly nickname: string
  constructor(username: string, password: string, nickname: string) {
    super()
    this.username = username
    this.password = password
    this.nickname = nickname
  }
}
