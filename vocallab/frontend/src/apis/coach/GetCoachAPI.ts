import { request } from '../request'
import { coachView } from './contracts'

export class GetCoachAPI {
  constructor(private readonly analysisId: string) {}
  send(signal?: AbortSignal) { return request(this, coachView, { analysisId: this.analysisId }, signal) }
}
