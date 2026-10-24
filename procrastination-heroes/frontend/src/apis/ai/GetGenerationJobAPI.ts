import type { GenerationJob } from '@/objects/ai/GenerationJob'
import type { JobId } from '@/objects/ai/JobId'
import { APIMessage } from '@/system/api/APIMessage'
export class GetGenerationJobAPI extends APIMessage<GenerationJob> {
  readonly jobId: JobId
  constructor(jobId: JobId) {
    super()
    this.jobId = jobId
  }
}
