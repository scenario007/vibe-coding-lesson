import { request } from '../request'
import { lyricsTrack } from './contracts'

export class SearchLyricsAPI {
  constructor(private readonly title: string, private readonly artist: string) {}
  send(signal: AbortSignal) { return request(this, lyricsTrack.array(), { title: this.title, artist: this.artist }, signal) }
}
