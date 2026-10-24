import type { RewardEvent } from '@/objects/economy/RewardEvent'
import { APIMessage } from '@/system/api/APIMessage'
export class ListRewardHistoryAPI extends APIMessage<RewardEvent[]> {
  constructor() {
    super()
  }
}
