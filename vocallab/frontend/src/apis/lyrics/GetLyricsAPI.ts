import { request } from '../request'
import { lyricsResponse } from './contracts'

export class GetLyricsAPI {
  constructor(private readonly id: number) {}
  send(signal: AbortSignal) { return request(this, lyricsResponse, { id: this.id }, signal) }
}
