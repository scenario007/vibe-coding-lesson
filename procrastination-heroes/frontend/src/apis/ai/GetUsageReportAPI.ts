import type { UsageReport } from '@/objects/ai/apiTypes/UsageReport'
import { APIMessage } from '@/system/api/APIMessage'
export class GetUsageReportAPI extends APIMessage<UsageReport> {}
