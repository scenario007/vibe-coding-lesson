import type { FocusResponse } from '@/objects/focus/apiTypes/FocusResponse'
import { APIMessage } from '@/system/api/APIMessage'
export class AbandonFocusAPI extends APIMessage<FocusResponse> {
  constructor() {
    super()
  }
}
