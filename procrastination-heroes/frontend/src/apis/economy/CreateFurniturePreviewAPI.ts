import type { FurniturePreview } from '@/objects/economy/FurniturePreview'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
import { APIMessage } from '@/system/api/APIMessage'

export class CreateFurniturePreviewAPI extends APIMessage<FurniturePreview> {
  constructor(
    readonly prompt: string,
    readonly slot: RoomSlot,
  ) {
    super()
  }
}
