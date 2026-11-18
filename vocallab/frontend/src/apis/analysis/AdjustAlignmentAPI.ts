import { request } from '../request'
import { report } from './contracts'

export class AdjustAlignmentAPI {
  constructor(private readonly analysisId: string, private readonly manualOffset: number | null,
    private readonly referenceRange?: [number, number]) {}
  send() {
    return request(this, report, { analysisId: this.analysisId, manualOffset: this.manualOffset, referenceRange: this.referenceRange })
  }
}
