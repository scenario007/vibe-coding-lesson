import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import { APIMessage } from '@/system/api/APIMessage'
export class GetDashboardAPI extends APIMessage<DashboardResponse> {
  constructor() {
    super()
  }
}
