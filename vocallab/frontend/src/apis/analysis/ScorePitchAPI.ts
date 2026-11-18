import { request } from '../request'
import { report } from './contracts'

export class ScorePitchAPI {
  constructor(private readonly analysisId: string) {}
  send() { return request(this, report, { analysisId: this.analysisId }) }
}
