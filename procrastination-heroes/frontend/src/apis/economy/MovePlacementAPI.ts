import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import { APIMessage } from '@/system/api/APIMessage'

export class MovePlacementAPI extends APIMessage<BaseResponse> {
  readonly id: string
  readonly x: number
  readonly y: number
  constructor(id: string, x: number, y: number) {
    super()
    this.id = id
    this.x = x
    this.y = y
  }
}
