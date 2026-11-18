import { request } from '../request'
import { researchResult, type SongInfo } from './contracts'

export class LookupCoachSourcesAPI {
  constructor(private readonly analysisId: string, private readonly song: SongInfo) {}
  send() { return request(this, researchResult, { analysisId: this.analysisId, song: this.song }) }
}
