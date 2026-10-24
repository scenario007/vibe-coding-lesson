import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
import { APIMessage } from '@/system/api/APIMessage'
export class PlaceItemAPI extends APIMessage<BaseResponse> {
  readonly slot: RoomSlot
  readonly itemId: string | null
  readonly rewardId: string | null
  constructor(slot: RoomSlot, itemId: string | null, rewardId: string | null) {
    super()
    this.slot = slot
    this.itemId = itemId
    this.rewardId = rewardId
  }
}
