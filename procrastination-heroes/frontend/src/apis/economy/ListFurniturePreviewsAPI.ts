import type { FurniturePreview } from '@/objects/economy/FurniturePreview'
import { APIMessage } from '@/system/api/APIMessage'

export class ListFurniturePreviewsAPI extends APIMessage<FurniturePreview[]> {}
