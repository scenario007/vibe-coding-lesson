import { endpoint } from '../request'

export class GetMediaAudioAPI {
  constructor(private readonly mediaId: string) {}
  url() { return endpoint(this, this.mediaId) }
}
