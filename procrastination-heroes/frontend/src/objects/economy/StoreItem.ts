import type { RewardPalette } from './RewardPalette'
import type { RewardSymbol } from './RewardSymbol'
import type { RoomSlot } from './RoomSlot'
export interface StoreItem {
  id: string
  name: string
  description: string
  price: number
  slot: RoomSlot
  symbol: RewardSymbol
  palette: RewardPalette
}
