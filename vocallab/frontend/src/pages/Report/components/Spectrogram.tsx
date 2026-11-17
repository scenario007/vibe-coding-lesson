import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Waves } from 'lucide-react'
import { GetAnalyzedAudioAPI } from '../../../apis/analysis/GetAnalyzedAudioAPI'
import type { PitchPreview, Report } from '../../../apis/analysis/contracts'
import { Button } from '../../../components/ui/Button'
import { Panel } from '../../../components/ui/Panel'
import { duration, lowestVisibleHz, lowestVisibleMidi, shortPitchFrames, timeLabel } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'
import { useSpectrogram, type Spectrum } from '../hooks/useSpectrogram'
import { trackNames } from './ListenPanel'

const pageSeconds = 30
const height = 300
const stops = [[11, 14, 24], [45, 40, 105], [132, 55, 142], [225, 114, 109], [255, 233, 163]]

// At wider frequency ranges, keep narrow energy peaks from disappearing between pixels.
function peakBin(data: Spectrum, sample: number, y: number, maxHz: number) {
  const span = maxHz - lowestVisibleHz
  const center = (lowestVisibleHz + (1 - y) * span) / data.binHz
  const half = span / (data.binHz * (height - 1) * 2)
  const floor = Math.min(data.bins - 1, Math.ceil(lowestVisibleHz / data.binHz))
  const nearest = Math.min(data.bins - 1, Math.max(floor, Math.round(center)))
  const start = Math.max(floor, Math.min(nearest, Math.ceil(center - half)))
  const end = Math.min(data.bins - 1, Math.max(nearest, Math.floor(center + half)))
  let peak = start
  for (let bin = start + 1; bin <= end; bin++)
    if (data.values[sample * data.bins + bin] > data.values[sample * data.bins + peak]) peak = bin
  return peak
}

export function Spectrogram({ report, playback, preview }: { report: Report; playback: Playback; preview: PitchPreview }) {
  const role = playback.active
  const total = duration(report, role)
  const pitch = report.pitchTracks[role]
  const harmonic = preview[role]
  const originalStart = pitch.originalStart
  const lastPage = Math.max(0, Math.ceil(total / pageSeconds) - 1)
  const page = Math.min(lastPage, Math.floor(playback.time / pageSeconds))
  const start = page * pageSeconds
  const end = Math.min(total, start + pageSeconds)
  const [view, setView] = useState<'fundamental' | 'full'>('fundamental')
  const [fullLimit, setFullLimit] = useState(2000)
  const maxHz = view === 'fundamental' ? 1200 : fullLimit
  const [hover, setHover] = useState<{ x: number; y: number }>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const result = useSpectrogram(new GetAnalyzedAudioAPI(report.analysisId, role, playback.kind).url(), start, end)
  const data = result.status === 'ready' ? result.spectrum : null
  const fundamentals = useMemo(() => {
    if (!data || view !== 'fundamental' || playback.kind === 'instrumental') return []
    const step = pitch.timestamps[1] - pitch.timestamps[0]
    const bridges = new Set(harmonic?.bridgedFrames)
    const estimates = harmonic?.midiPitch ?? pitch.midiPitch.map((midi, i) => midi ?? pitch.guideMidiPitch?.[i])
    const hidden = shortPitchFrames(estimates, harmonic?.step ?? step)
    return Array.from({ length: data.columns }, (_, column) => {
      const time = start + column * (end - start) / (data.columns - 1)
      const index = Math.round(time / step)
      const trusted = pitch.f0Hz[index]
      if (harmonic) {
        const frame = Math.round(time / harmonic.step)
        const midi = harmonic.midiPitch[frame]
        if (midi == null || midi < lowestVisibleMidi || bridges.has(frame) || hidden.has(frame)) return null
        const verified = pitch.midiPitch[index]
        return { hz: 440 * 2 ** ((midi - 69) / 12), trusted: verified != null && Math.abs(verified - midi) <= 1 }
      }
      if (hidden.has(index)) return null
      if (trusted != null) return trusted >= lowestVisibleHz ? { hz: trusted, trusted: true } : null
      const candidate = pitch.guideMidiPitch?.[index]
      return candidate == null || candidate < lowestVisibleMidi ? null : { hz: 440 * 2 ** ((candidate - 69) / 12), trusted: false }
    })
  }, [data, view, playback.kind, pitch, harmonic, start, end])

  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context || !data) return
    const columns = data.columns
    const image = context.createImageData(columns, height)
    function paint(x: number, y: number, db: number, alpha = 255, minimum = 0) {
      const intensity = Math.max(minimum, Math.min(1, Math.max(0, (db + 80) / 70))) * (stops.length - 1)
      const low = Math.min(stops.length - 2, Math.floor(intensity))
      const part = intensity - low
      const offset = (y * columns + x) * 4
      for (let c = 0; c < 3; c++) image.data[offset + c] = stops[low][c] + part * (stops[low + 1][c] - stops[low][c])
      image.data[offset + 3] = alpha
    }
    if (view === 'fundamental') {
      fundamentals.forEach((point, x) => {
        if (!point || point.hz > maxHz) return
        const center = Math.round((maxHz - point.hz) / (maxHz - lowestVisibleHz) * (height - 1))
        const bin = Math.min(data.bins - 1, Math.round(point.hz / data.binHz))
        const db = data.values[x * data.bins + bin]
        for (let y = Math.max(0, center - 1); y <= Math.min(height - 1, center + 1); y++) {
          paint(x, y, db, point.trusted ? 255 : 135, .45)
        }
      })
    } else {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < data.columns; x++) {
          const bin = peakBin(data, x, y / (height - 1), maxHz)
          paint(x, y, data.values[x * data.bins + bin])
        }
      }
    }
    context.putImageData(image, 0, 0)
  }, [data, maxHz, view, fundamentals])

  function coordinates(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }
  }
  const location = hover && data ? {
    sample: Math.round(hover.x * (data.columns - 1)),
    bin: peakBin(data, Math.round(hover.x * (data.columns - 1)), hover.y, maxHz),
  } : null
  const hoveredFundamental = location ? fundamentals[location.sample] : null
  const hoverTime = hover ? timeLabel(originalStart + start + hover.x * (end - start)) : ''
  const cursor = (playback.time - start) / (end - start) * 100

  return <Panel className="p-4 sm:p-6" aria-labelledby="spectrogram-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="spectrogram-heading" className="flex items-center gap-2 font-bold"><Waves size={19} className="text-accent"/> 声谱图</h2>
        <p className="mt-1.5 text-xs text-muted">{role === 'reference' ? 'A 原唱' : 'B 我的演唱'} · {trackNames[playback.kind]}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 text-xs text-muted">视图
          <select className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink" value={view}
            onChange={event => { setView(event.currentTarget.value === 'full' ? 'full' : 'fundamental'); setHover(undefined) }}>
            <option value="fundamental">只看人声基频</option><option value="full">完整声谱</option>
          </select>
        </label>
        {view === 'full' && <label className="flex items-center gap-2 text-xs text-muted">频率上限
          <select className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink" value={fullLimit}
            onChange={event => { setFullLimit(Number(event.currentTarget.value)); setHover(undefined) }}>
            <option value={1000}>1 kHz</option><option value={2000}>2 kHz</option>
            <option value={5000}>5 kHz</option><option value={22050}>22.05 kHz</option>
          </select>
        </label>}
      </div>
    </div>
    {result.status === 'loading' && <p role="status" className="mt-4 text-sm text-muted">正在生成声谱图…</p>}
    {result.status === 'error' && <p role="alert" className="mt-4 text-sm text-danger">无法读取此音轨的声谱图。</p>}
    {view === 'fundamental' && data && !fundamentals.some(Boolean) &&
      <p className="mt-3 text-xs text-muted">{playback.kind === 'instrumental' ?
        '试听伴奏时可切到完整声谱；切回人声音轨可查看人声基频。' : '这一段没有测到可显示的人声基频。'}</p>}
    {data && <div className="mt-4 grid grid-cols-[5.75rem_1fr] gap-x-2">
      <div className="flex h-[245px] flex-col justify-between text-right font-mono text-[11px] text-muted sm:h-[300px]">
        {[1, .75, .5, .25, 0].map(part => <span key={part}>{part === 0 ? `C3 · ${lowestVisibleHz.toFixed(1)} Hz` : `${Math.round(lowestVisibleHz + part * (maxHz - lowestVisibleHz))} Hz`}</span>)}
      </div>
      <div className="relative h-[245px] min-w-0 overflow-hidden rounded-lg border border-line bg-canvas sm:h-[300px]">
        <canvas ref={canvas} width={data.columns} height={height} role="img" aria-label="当前音频声谱图"
          className="h-full w-full cursor-crosshair"
          onPointerMove={event => setHover(coordinates(event))} onPointerLeave={() => setHover(undefined)}
          onClick={event => {
            const rect = event.currentTarget.getBoundingClientRect()
            playback.jump(start + (end - start) * (event.clientX - rect.left) / rect.width)
          }}/>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-white/80" style={{ left: `${cursor}%` }}/>
      </div>
      <div className="col-start-2 mt-1.5 flex justify-between font-mono text-[11px] text-muted">
        <span>{timeLabel(originalStart + start)}</span><span>{timeLabel(originalStart + end)}</span>
      </div>
    </div>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <p>{view === 'fundamental' ?
        location ? hoveredFundamental ?
          `${hoverTime} · ${hoveredFundamental.trusted ? '基频' : '候选基频'} ${hoveredFundamental.hz.toFixed(1)} Hz` :
          `${hoverTime} · 没有测到基频` :
          harmonic ? '只显示分析音轨的人声基频。淡色为谐波估计，亮色表示 pYIN 给出了相近结果。' :
            '只显示报告测得的人声基频。淡色为候选，留白为没有可用测量。点击可定位。' :
        location && data ?
          `${hoverTime} · 频点 ${(location.bin * data.binHz).toFixed(1)} Hz · ${data.values[location.sample * data.bins + location.bin].toFixed(1)} dBFS` :
          '颜色越亮表示该频点能量越高。指向读取频点，点击跳到对应时间复听。'}</p>
      {lastPage > 0 && <div className="flex items-center gap-2">
        <Button aria-label="声谱图上一段" className="min-h-8 px-2" disabled={page === 0} onClick={() => playback.jump((page - 1) * pageSeconds)}><ChevronLeft size={15}/></Button>
        <span>{page + 1} / {lastPage + 1}</span>
        <Button aria-label="声谱图下一段" className="min-h-8 px-2" disabled={page === lastPage} onClick={() => playback.jump((page + 1) * pageSeconds)}><ChevronRight size={15}/></Button>
      </div>}
    </div>
  </Panel>
}
