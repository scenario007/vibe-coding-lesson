import { request } from '../request'
import { coachConnectionTest } from './contracts'

export class TestCoachConnectionAPI {
  send() { return request(this, coachConnectionTest, {}) }
}
