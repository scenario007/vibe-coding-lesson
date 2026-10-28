import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import type { RewardPalette } from '@/objects/economy/RewardPalette'
import type { RewardSymbol } from '@/objects/economy/RewardSymbol'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
import { APIMessage } from '@/system/api/APIMessage'

export class CreateCustomFurnitureAPI extends APIMessage<BaseResponse> {
  readonly prompt: string
  readonly slot: RoomSlot
  readonly symbol: RewardSymbol
  readonly palette: RewardPalette
  constructor(prompt: string, slot: RoomSlot, symbol: RewardSymbol, palette: RewardPalette) {
    super()
    this.prompt = prompt
    this.slot = slot
    this.symbol = symbol
    this.palette = palette
  }
}
