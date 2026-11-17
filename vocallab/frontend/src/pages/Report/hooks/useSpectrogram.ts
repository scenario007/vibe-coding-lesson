import { useEffect, useRef, useState } from 'react'

export type Spectrum = {
  id: number
  values: Float32Array
  columns: number
  bins: number
  binHz: number
}
type Result = { status: 'loading' } | { status: 'error' } |
  { status: 'ready'; spectrum: Spectrum; start: number; end: number; url: string }

export function useSpectrogram(url: string, start: number, end: number) {
  const [result, setResult] = useState<Result>({ status: 'loading' })
  const worker = useRef<Worker>(null)
  const ready = useRef<Promise<boolean>>(null)
  useEffect(() => {
    const controller = new AbortController()
    const instance = new Worker(new URL('../functions/spectrum.worker.ts', import.meta.url), { type: 'module' })
    worker.current = instance
    instance.onerror = () => setResult({ status: 'error' })
    ready.current = (async () => {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw Error('Track unavailable')
      const bytes = await response.arrayBuffer()
      if (controller.signal.aborted) return false
      const audio = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes)
      if (controller.signal.aborted) return false
      const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i).slice())
      instance.postMessage({ type: 'load', channels, rate: audio.sampleRate }, channels.map(channel => channel.buffer))
      return true
    })().catch(() => {
      if (!controller.signal.aborted) setResult({ status: 'error' })
      return false
    })
    return () => { controller.abort(); instance.terminate() }
  }, [url])

  const next = useRef(0)
  useEffect(() => {
    const instance = worker.current
    if (!instance) return
    const id = ++next.current
    let cancelled = false
    setResult({ status: 'loading' })
    function receive(event: MessageEvent<Spectrum>) {
      if (event.data.id === id) setResult({ status: 'ready', spectrum: event.data, start, end, url })
    }
    instance.addEventListener('message', receive)
    void ready.current?.then(ok => {
      if (ok && !cancelled) instance.postMessage({ type: 'scan', id, start, end })
      else if (!ok && !cancelled) setResult({ status: 'error' })
    })
    return () => {
      cancelled = true
      instance.removeEventListener('message', receive)
    }
  }, [url, start, end])
  return result.status === 'ready' && (result.url !== url || result.start !== start || result.end !== end)
    ? { status: 'loading' as const } : result
}
