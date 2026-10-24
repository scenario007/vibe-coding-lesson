import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import { APIMessage } from '@/system/api/APIMessage'
export class GetBaseAPI extends APIMessage<BaseResponse> {
  constructor() {
    super()
  }
}
