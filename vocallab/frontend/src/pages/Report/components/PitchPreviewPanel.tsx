import { useMemo, useRef, useState } from 'react'
import type { ClipSelection, HarmonicPitch, Job, PitchPreview, Role } from '../../../apis/analysis/contracts'
import { GetAnalyzedAudioAPI } from '../../../apis/analysis/GetAnalyzedAudioAPI'
import { Panel } from '../../../components/ui/Panel'
import { harmonicPoints } from '../functions/timeline'
import { PitchPlot } from './PitchChart'

function TrackPreview({ id, role, clip, track }: {
  id: string; role: Role; clip: ClipSelection; track: HarmonicPitch
}) {
  const audio = useRef<HTMLAudioElement>(null)
  const [time, setTime] = useState(0)
  const [audioError, setAudioError] = useState(false)
  const points = useMemo(() => harmonicPoints(track, clip.start), [track, clip.start])
  const name = role === 'reference' ? '原唱' : '我的演唱'
  return <div className="mt-5">
    <h3 className="mb-1 text-sm font-semibold">{name}</h3>
    <PitchPlot total={clip.end-clip.start} start={clip.start} axis={role} first={points}
      activeTime={time} harmonic position={next => {
        if (!audio.current || !Number.isFinite(audio.current.duration)) return
        audio.current.currentTime = next
        setTime(next)
      }}/>
    {points.every(point => point.midi === null) && <p className="mb-2 text-xs text-muted">未找到连续的基频证据。</p>}
    <audio ref={audio} controls preload="metadata" aria-label={`${name}预览音频`} className="w-full"
      src={new GetAnalyzedAudioAPI(id, role, clip.separate ? 'vocals' : 'original').url()}
      onTimeUpdate={event => setTime(event.currentTarget.currentTime)} onError={() => setAudioError(true)}/>
    {audioError && <p className="mt-1 text-xs text-danger">预览音频暂时无法播放。</p>}
  </div>
}

export function PitchPreviewPanel({ job, preview }: { job: Job; preview: PitchPreview }) {
  if (!preview.reference && !preview.user) return null
  return <Panel className="mt-4 p-4 sm:p-6" aria-labelledby="pitch-preview-heading">
    <h2 id="pitch-preview-heading" className="font-bold">快速基频预览</h2>
    <p className="mt-1 text-xs text-muted">两轨使用各自的文件时间。对齐和音准分析仍在后台进行。</p>
    {(['reference', 'user'] as const).map(role => {
      const track = preview[role]
      return track && <TrackPreview key={role} id={job.analysisId} role={role} clip={job.selection[role]} track={track}/>
    })}
  </Panel>
}
