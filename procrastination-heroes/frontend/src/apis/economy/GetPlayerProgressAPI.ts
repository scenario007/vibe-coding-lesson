import type { PlayerProgress } from '@/objects/economy/PlayerProgress'
import { APIMessage } from '@/system/api/APIMessage'
export class GetPlayerProgressAPI extends APIMessage<PlayerProgress> {
  constructor() {
    super()
  }
}
