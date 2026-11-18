import { request } from '../request'
import { coachView } from './contracts'

export class SetCoachKeyAPI {
  constructor(private readonly analysisId: string, private readonly kind: 'ai' | 'search', private readonly key: string | null) {}
  send() { return request(this, coachView, { analysisId: this.analysisId, kind: this.kind, key: this.key }) }
}
