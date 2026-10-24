import type { GenerationJob } from '@/objects/ai/GenerationJob'
import { APIMessage } from '@/system/api/APIMessage'
export class RequestPlanGenerationAPI extends APIMessage<GenerationJob> {
  readonly goal: string
  readonly dueDate: string | null
  readonly dailyMinutes: number
  readonly preference: string
  readonly feedback: string
  readonly requestKey: string
  constructor(
    goal: string,
    dueDate: string | null,
    dailyMinutes: number,
    preference: string,
    feedback: string,
    requestKey: string,
  ) {
    super()
    this.goal = goal
    this.dueDate = dueDate
    this.dailyMinutes = dailyMinutes
    this.preference = preference
    this.feedback = feedback
    this.requestKey = requestKey
  }
}
