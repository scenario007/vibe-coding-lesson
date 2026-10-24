import type { StepCompletionResponse } from '@/objects/quests/apiTypes/StepCompletionResponse'
import type { QuestId } from '@/objects/quests/QuestId'
import type { StepId } from '@/objects/quests/StepId'
import { APIMessage } from '@/system/api/APIMessage'
export class CompleteQuestStepAPI extends APIMessage<StepCompletionResponse> {
  readonly questId: QuestId
  readonly stepId: StepId
  constructor(questId: QuestId, stepId: StepId) {
    super()
    this.questId = questId
    this.stepId = stepId
  }
}
