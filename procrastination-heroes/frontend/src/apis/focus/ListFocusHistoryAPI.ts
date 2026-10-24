import type { FocusSession } from '@/objects/focus/FocusSession'
import { APIMessage } from '@/system/api/APIMessage'
export class ListFocusHistoryAPI extends APIMessage<FocusSession[]> {
  constructor() {
    super()
  }
}
