import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import { APIMessage } from '@/system/api/APIMessage'
export class PurchaseStoreItemAPI extends APIMessage<BaseResponse> {
  readonly itemId: string
  constructor(itemId: string) {
    super()
    this.itemId = itemId
  }
}
