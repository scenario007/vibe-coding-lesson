import type { FocusResponse } from '@/objects/focus/apiTypes/FocusResponse'
import type { StepId } from '@/objects/quests/StepId'
import { APIMessage } from '@/system/api/APIMessage'
export class StartFocusAPI extends APIMessage<FocusResponse> {
  readonly stepId: StepId | null
  readonly minutes: number
  constructor(stepId: StepId | null, minutes: number) {
    super()
    this.stepId = stepId
    this.minutes = minutes
  }
}
