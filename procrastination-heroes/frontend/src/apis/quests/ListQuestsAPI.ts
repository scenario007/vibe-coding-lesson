import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import { APIMessage } from '@/system/api/APIMessage'
export class ListQuestsAPI extends APIMessage<QuestDetail[]> {
  constructor() {
    super()
  }
}
