import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { media, separationMode, type Limits, type Role } from '../../../apis/analysis/contracts'
import { UploadMediaAPI } from '../../../apis/analysis/UploadMediaAPI'
import { GetMediaLimitsAPI } from '../../../apis/analysis/GetMediaLimitsAPI'
import { CreateAnalysisAPI } from '../../../apis/analysis/CreateAnalysisAPI'
import type { ReadyUpload, Upload } from '../objects/Upload'

const ready = z.object({ status: z.literal('ready'), media, start: z.number(), end: z.number(), separate: z.boolean(), separationMode: separationMode.optional() })
const saved = z.object({ reference: ready.nullable(), user: ready.nullable() })
const storage = 'vocallab-studio-v1'
type Uploads = Record<Role, Upload>

function restore(): Uploads {
  try {
    const draft = saved.parse(JSON.parse(sessionStorage.getItem(storage) ?? '{}'))
    return { reference: draft.reference ?? { status: 'empty' }, user: draft.user ?? { status: 'empty' } }
  } catch { return { reference: { status: 'empty' }, user: { status: 'empty' } } }
}

function valid(upload: Upload, limit: number): upload is ReadyUpload {
  return upload.status === 'ready' && upload.start >= 0 && upload.end <= upload.media.duration + 0.0001
    && upload.end - upload.start >= 1 && upload.end - upload.start <= limit
}

export function useStudio() {
  const [uploads, setUploads] = useState(restore)
  const [limits, setLimits] = useState<Limits>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const requests = useRef<Partial<Record<Role, AbortController>>>({})
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    const active = requests.current
    new GetMediaLimitsAPI().send(controller.signal).then(setLimits).catch((e: Error) => {
      if (!controller.signal.aborted) setError(e.message)
    })
    return () => {
      controller.abort()
      Object.values(active).forEach(request => request.abort())
    }
  }, [])

  useEffect(() => {
    const { reference, user } = uploads
    sessionStorage.setItem(storage, JSON.stringify({
      reference: reference.status === 'ready' ? reference : null,
      user: user.status === 'ready' ? user : null,
    }))
  }, [uploads])

  function update(role: Role, upload: Upload) {
    setUploads(value => ({ ...value, [role]: upload }))
  }

  async function choose(role: Role, file: File) {
    requests.current[role]?.abort()
    if (!/\.(wav|mp3|m4a|mp4|mov)$/i.test(file.name)) {
      update(role, { status: 'error', message: '请选择 WAV、MP3、M4A、MP4 或 MOV 文件。' })
      return
    }
    if (limits && file.size > limits.maxBytes) {
      update(role, { status: 'error', message: `文件大小超过 ${limits.maxBytes / 1048576} MiB。` })
      return
    }
    const controller = new AbortController()
    requests.current[role] = controller
    update(role, { status: 'uploading', name: file.name, progress: 0 })
    try {
      const info = await new UploadMediaAPI(file).send(progress => {
        if (!controller.signal.aborted) update(role, { status: 'uploading', name: file.name, progress })
      }, controller.signal)
      if (!controller.signal.aborted) update(role, { status: 'ready', media: info,
        start: 0, end: Math.min(info.duration, limits?.maxClip ?? 300, 30), separate: role === 'reference' })
    } catch (e) {
      if (!controller.signal.aborted) update(role, { status: 'error', message: (e as Error).message })
    }
  }

  const canStart = Boolean(limits && valid(uploads.reference, limits.maxClip) && valid(uploads.user, limits.maxClip))
  async function start() {
    const { reference, user } = uploads
    if (!limits || !valid(reference, limits.maxClip) || !valid(user, limits.maxClip)) return
    const toClip = (upload: ReadyUpload) => ({ mediaId: upload.media.id, start: upload.start,
      end: upload.end, separate: upload.separate, separationMode: upload.separationMode ?? 'fast' })
    setError('')
    setLoading(true)
    try {
      const job = await new CreateAnalysisAPI({ reference: toClip(reference), user: toClip(user), manualOffset: null }).send()
      navigate(`/analysis/${job.analysisId}`)
    } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }

  return { uploads, limits, error, loading, canStart, update, choose, start,
    clear: (role: Role) => { requests.current[role]?.abort(); update(role, { status: 'empty' }) } }
}
