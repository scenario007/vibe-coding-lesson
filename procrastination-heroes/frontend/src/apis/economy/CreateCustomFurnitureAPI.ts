import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
import { APIMessage } from '@/system/api/APIMessage'

export class CreateCustomFurnitureAPI extends APIMessage<BaseResponse> {
  readonly prompt: string
  readonly slot: RoomSlot
  constructor(prompt: string, slot: RoomSlot) {
    super()
    this.prompt = prompt
    this.slot = slot
  }
}
