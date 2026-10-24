import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import type { QuestId } from '@/objects/quests/QuestId'
import { APIMessage } from '@/system/api/APIMessage'
export class UpdateQuestNotesAPI extends APIMessage<QuestDetail> {
  readonly questId: QuestId
  readonly reflection: string
  readonly dueDate: string | null
  constructor(questId: QuestId, reflection: string, dueDate: string | null) {
    super()
    this.questId = questId
    this.reflection = reflection
    this.dueDate = dueDate
  }
}
