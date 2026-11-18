import { useMemo } from 'react'
import { AudioWaveform } from 'lucide-react'
import type { Report, Role } from '../../../apis/analysis/contracts'
import { Panel } from '../../../components/ui/Panel'
import { duration, hasPlaybackMapping, playbackTime, timeLabel } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'

const columns = 640

function envelope(report: Report, role: Role, shared: boolean) {
  const { rms, timestamps } = report.pitchTracks[role]
  const span = duration(report, shared ? 'reference' : role)
  const peaks = new Float32Array(columns)
  timestamps.forEach((time, i) => {
    const position = role === 'user' && shared ? playbackTime(report, 'user', time) : time
    if (position < 0 || position > span) return
    const column = Math.min(columns - 1, Math.round(position / span * (columns - 1)))
    peaks[column] = Math.max(peaks[column], rms[i])
  })
  const maximum = Math.max(.0001, ...peaks)
  const path = Array.from(peaks, (peak, x) => {
    const height = Math.sqrt(peak / maximum) * 21
    return height > 0 ? `M${x} ${(23 - height).toFixed(1)}V${(23 + height).toFixed(1)}` : ''
  }).join('')
  return { path, span }
}

export function WaveformComparison({ report, playback }: { report: Report; playback: Playback }) {
  const shared = hasPlaybackMapping(report)
  const waves = useMemo(() => ({
    reference: envelope(report, 'reference', shared),
    user: envelope(report, 'user', shared),
  }), [report, shared])
  return <Panel className="p-4 sm:p-6" aria-labelledby="wave-heading">
    <h2 id="wave-heading" className="flex items-center gap-2 font-bold"><AudioWaveform size={18} className="text-accent"/> 波形对照</h2>
    <p className="mt-1 text-xs text-muted">短时音量包络 · {shared ? '共用原唱时间轴' : '各自的录音时间'}</p>
    <div className="mt-3 grid gap-2">
      {(['reference', 'user'] as const).map(role => {
        const axis = shared ? 'reference' : role
        const { path, span } = waves[role]
        const current = shared ? playback.time : playback.times[axis]
        const start = report.pitchTracks[axis].originalStart
        return <div key={role} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-2">
          <span className={role === 'reference' ? 'text-xs text-accent' : 'text-xs text-mint'}>
            {role === 'reference' ? 'A 原唱' : 'B 翻唱'}
          </span>
          <svg role="img" aria-label={role === 'reference' ? '原唱波形包络' : '翻唱波形包络'} viewBox={`0 0 ${columns} 46`}
            className="h-12 w-full rounded bg-canvas" preserveAspectRatio="none">
            <line x1="0" x2={columns} y1="23" y2="23" className="stroke-line"/>
            <path d={path} className={role === 'reference' ? 'stroke-accent' : 'stroke-mint'}/>
            {current >= 0 && current <= span && <line x1={current / span * columns} x2={current / span * columns}
              y1="0" y2="46" className="stroke-white/70"/>}
          </svg>
          {(!shared || role === 'user') && <div className="col-start-2 flex justify-between font-mono text-[11px] text-muted">
            <span>{timeLabel(start)}</span><span>{timeLabel(start + span)}</span>
          </div>}
        </div>
      })}
    </div>
  </Panel>
}
