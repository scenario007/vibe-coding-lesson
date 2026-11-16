import { request } from '../request'
import { job } from './contracts'

export class AdjustAlignmentAPI {
  constructor(private readonly analysisId: string, private readonly manualOffset: number | null) {}
  send() { return request(this, job, { analysisId: this.analysisId, manualOffset: this.manualOffset }) }
}
