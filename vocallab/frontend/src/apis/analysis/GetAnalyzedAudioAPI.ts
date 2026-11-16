import { endpoint } from '../request'
import type { Role, TrackKind } from './contracts'

export class GetAnalyzedAudioAPI {
  constructor(private readonly analysisId: string, private readonly role: Role, private readonly track: TrackKind) {}
  url() { return endpoint(this, this.analysisId, this.role, this.track) }
}
