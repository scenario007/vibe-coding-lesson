import { request } from '../request'
import { job } from './contracts'

export class GetAnalysisAPI {
  constructor(private readonly analysisId: string) {}
  send(signal: AbortSignal) { return request(this, job, { analysisId: this.analysisId }, signal) }
}
