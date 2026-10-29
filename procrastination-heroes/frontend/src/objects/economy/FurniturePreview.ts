import type { RoomSlot } from './RoomSlot'

export interface FurniturePreview {
  id: string
  prompt: string
  refinedDescription: string
  slot: RoomSlot
  imageUrl: string
  createdAt: number
  confirmed: boolean
}
