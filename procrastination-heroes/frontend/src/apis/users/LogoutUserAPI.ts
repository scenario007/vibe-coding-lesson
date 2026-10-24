import type { ActionResult } from '@/objects/system/ActionResult'
import { APIMessage } from '@/system/api/APIMessage'
export class LogoutUserAPI extends APIMessage<ActionResult> {
  constructor() {
    super()
  }
}
