import { request } from '../request'
import { coachSettings } from './contracts'

export type CoachKeyKind = 'ai' | 'deepseek' | 'search'

export class SetCoachKeyAPI {
  constructor(private readonly kind: CoachKeyKind, private readonly key: string | null) {}
  send() { return request(this, coachSettings, { kind: this.kind, key: this.key }) }
}
