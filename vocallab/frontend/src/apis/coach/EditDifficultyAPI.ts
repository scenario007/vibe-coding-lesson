import { request } from '../request'
import { coachView } from './contracts'

export class EditDifficultyAPI {
  constructor(private readonly analysisId: string, private readonly input: { id?: string; remove: boolean; title?: string; tool?: string; start?: number; end?: number }) {}
  send(signal?: AbortSignal) { return request(this, coachView, { analysisId: this.analysisId, ...this.input }, signal) }
}
