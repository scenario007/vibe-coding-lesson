import { request } from '../request'
import { coachSettings } from './contracts'

export class GetCoachSettingsAPI {
  send(signal: AbortSignal) { return request(this, coachSettings, {}, signal) }
}
