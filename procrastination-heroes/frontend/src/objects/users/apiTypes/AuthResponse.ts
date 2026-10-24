import type { UserProfile } from '@/objects/users/UserProfile'
export interface AuthResponse {
  token: string
  user: UserProfile
}
