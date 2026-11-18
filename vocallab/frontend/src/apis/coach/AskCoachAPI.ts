import { request } from '../request'
import { coachView } from './contracts'

export class AskCoachAPI {
  constructor(private readonly analysisId: string, private readonly input: { question: string; segmentId?: string; start?: number; end?: number }) {}
  send(signal?: AbortSignal) { return request(this, coachView, { analysisId: this.analysisId, ...this.input }, signal) }
}
