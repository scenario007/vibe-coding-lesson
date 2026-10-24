import type { FocusSession } from '@/objects/focus/FocusSession'
export interface FocusResponse {
  session: FocusSession | null
  serverNow: number
}
