import { request } from '../request'
import { limits } from './contracts'

export class GetMediaLimitsAPI {
  send(signal: AbortSignal) { return request(this, limits, undefined, signal) }
}
