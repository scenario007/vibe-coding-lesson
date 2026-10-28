import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import { APIMessage } from '@/system/api/APIMessage'
export class PlaceItemAPI extends APIMessage<BaseResponse> {
  readonly slot: string
  readonly itemId: string | null
  readonly rewardId: string | null
  constructor(slot: string, itemId: string | null, rewardId: string | null) {
    super()
    this.slot = slot
    this.itemId = itemId
    this.rewardId = rewardId
  }
}
