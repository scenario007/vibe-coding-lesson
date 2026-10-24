import type { GenerationJob } from '@/objects/ai/GenerationJob'
import { APIMessage } from '@/system/api/APIMessage'
export class ListGenerationJobsAPI extends APIMessage<GenerationJob[]> {}
