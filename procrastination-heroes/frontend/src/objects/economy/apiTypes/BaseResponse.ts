import type { OwnedItem } from '@/objects/economy/OwnedItem'
import type { PlayerProgress } from '@/objects/economy/PlayerProgress'
import type { RoomPlacement } from '@/objects/economy/RoomPlacement'
import type { StoreItem } from '@/objects/economy/StoreItem'
import type { TaskReward } from '@/objects/economy/TaskReward'
export interface BaseResponse {
  items: StoreItem[]
  owned: OwnedItem[]
  rewards: TaskReward[]
  placements: RoomPlacement[]
  progress: PlayerProgress
}
