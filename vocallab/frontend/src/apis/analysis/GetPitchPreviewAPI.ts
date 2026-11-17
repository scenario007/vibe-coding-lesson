import { request } from '../request'
import { pitchPreview } from './contracts'

export class GetPitchPreviewAPI {
  constructor(private readonly analysisId: string) {}
  send(signal: AbortSignal) { return request(this, pitchPreview, { analysisId: this.analysisId }, signal) }
}
