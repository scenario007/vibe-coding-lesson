import { request } from '../request'
import { coachView, type SongInfo } from './contracts'

export class AnalyzeCoachAPI {
  constructor(private readonly analysisId: string, private readonly input: { song: SongInfo; deep: boolean; extraTools: string[]; highThreshold: number | null; refresh: boolean; recheck?: boolean }) {}
  send(signal?: AbortSignal) { return request(this, coachView, { analysisId: this.analysisId, ...this.input }, signal) }
}
