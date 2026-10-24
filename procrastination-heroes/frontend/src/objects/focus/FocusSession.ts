import type { FocusId } from '@/objects/focus/FocusId'
import type { FocusStatus } from '@/objects/focus/FocusStatus'
import type { StepId } from '@/objects/quests/StepId'
import type { UserId } from '@/objects/users/UserId'
export interface FocusSession {
  id: FocusId
  userId: UserId
  stepId: StepId | null
  targetSeconds: number
  status: FocusStatus
  elapsedSeconds: number
  runningSince: number | null
  createdAt: number
  endedAt: number | null
}
