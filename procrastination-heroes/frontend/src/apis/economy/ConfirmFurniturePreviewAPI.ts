import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import { APIMessage } from '@/system/api/APIMessage'

export class ConfirmFurniturePreviewAPI extends APIMessage<BaseResponse> {
  constructor(
    readonly previewId: string,
    readonly useOriginal: boolean,
  ) {
    super()
  }
}
