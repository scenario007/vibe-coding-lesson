import { request } from '../request'
import { report } from './contracts'

export class GetAnalysisResultAPI {
  constructor(private readonly analysisId: string) {}
  send(signal: AbortSignal) { return request(this, report, { analysisId: this.analysisId }, signal) }
}
