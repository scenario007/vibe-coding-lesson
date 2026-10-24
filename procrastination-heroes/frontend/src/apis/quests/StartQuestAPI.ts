import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import type { QuestId } from '@/objects/quests/QuestId'
import { APIMessage } from '@/system/api/APIMessage'
export class StartQuestAPI extends APIMessage<QuestDetail> {
  readonly questId: QuestId
  constructor(questId: QuestId) {
    super()
    this.questId = questId
  }
}
