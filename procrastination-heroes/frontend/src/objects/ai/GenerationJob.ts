import type { JobId } from '@/objects/ai/JobId'
import type { JobStatus } from '@/objects/ai/JobStatus'
import type { PlanDraft } from '@/objects/ai/PlanDraft'
import type { UserId } from '@/objects/users/UserId'
export interface GenerationJob {
  id: JobId
  userId: UserId
  status: JobStatus
  goal: string
  dueDate: string | null
  dailyMinutes: number | null
  preference: string
  feedback: string
  result: PlanDraft | null
  error: string | null
  createdAt: number
}
