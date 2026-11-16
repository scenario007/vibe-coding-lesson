import { checked, endpoint, errorText } from '../request'
import { media, type Media } from './contracts'

export class UploadMediaAPI {
  constructor(private readonly file: File) {}

  send(progress: (value: number) => void, signal: AbortSignal): Promise<Media> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', endpoint(this))
      xhr.responseType = 'json'
      xhr.setRequestHeader('X-VocalLab', '1')
      xhr.setRequestHeader('X-File-Name', encodeURIComponent(this.file.name))
      xhr.setRequestHeader('Content-Type', 'application/octet-stream')
      const cancel = () => xhr.abort()
      signal.addEventListener('abort', cancel, { once: true })
      xhr.onloadend = () => signal.removeEventListener('abort', cancel)
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) progress(event.loaded / event.total)
      }
      xhr.upload.onload = () => progress(1)
      xhr.onerror = () => reject(new Error('上传中断，请检查本地服务。'))
      xhr.onabort = () => reject(new DOMException('上传已取消', 'AbortError'))
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(errorText(xhr.response, xhr.status)))
          return
        }
        try { resolve(checked(media, xhr.response)) } catch (error) { reject(error) }
      }
      xhr.send(this.file)
    })
  }
}
