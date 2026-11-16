import { request } from '../request'
import { job, type Selection } from './contracts'

export class CreateAnalysisAPI {
  constructor(private readonly selection: Selection) {}
  send() { return request(this, job, this.selection) }
}
