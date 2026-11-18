import { useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
import type { PitchPreview, Report, Role } from '../../../apis/analysis/contracts'
import { Panel } from '../../../components/ui/Panel'
import { parseLrc } from '../../lyrics/lrc'
import { useLyrics } from '../../lyrics/useLyrics'
import { hasPlaybackMapping, points, type TimeRange } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'
import { PitchPlot, type LyricCue } from './PitchPlot'
import { PitchTransport } from './PitchTransport'
import { ReportLyrics } from './ReportLyrics'

function ReportPlot({ report, playback, axis, overlay, quick, preview, lyrics }: {
  report: Report; playback: Playback; axis: Role; overlay: boolean; quick: boolean; preview: PitchPreview; lyrics?: LyricCue[]
}) {
  const first = useMemo(() => points(report, axis, quick ? preview[axis] : null), [report, axis, preview, quick])
  const comparison = useMemo(() => {
    if (!overlay) return undefined
    const track = quick ? preview.user : null
    return { points: points(report, 'user', track, true), scale: points(report, 'user', track) }
  }, [report, overlay, preview, quick])
  const origin = report.pitchTracks[axis].originalStart
  const annotations = useMemo(() => report.segments.flatMap(segment => {
    const a = axis === 'reference' ? segment.referenceStart : segment.userStart
    const b = axis === 'reference' ? segment.referenceEnd : segment.userEnd
    return a === null || b === null ? [] : [[a - origin, b - origin] as TimeRange]
  }), [report, axis, origin])
  return <PitchPlot limits={overlay ? playback.all : [0, playback.bounds[axis][1]]} origin={origin}
    axis={axis} first={first} second={comparison?.points} scaleSecond={comparison?.scale} time={overlay ? playback.time : playback.times[axis]}
    selected={playback.range[axis]} annotations={annotations} harmonic={quick && (preview[axis] !== null || overlay && preview.user !== null)}
    playing={playback.playing} playable={playback.enabled.reference || playback.enabled.user} toggle={playback.toggle}
    scrubStart={playback.beginScrub} scrubEnd={at => playback.endScrub(axis, at)} lyrics={lyrics}
    seek={at => playback.position(axis, at)}/>
}

export function PitchChart({ report, playback, preview }: { report: Report; playback: Playback; preview: PitchPreview }) {
  const [review, setReview] = useState(false)
  const hasPreview = Boolean(preview.reference || preview.user)
  const quick = hasPreview && !review
  const mapped = hasPlaybackMapping(report)
  const media = report.referenceMetadata
  const lyrics = useLyrics(media.id, media.duration)
  const lrc = lyrics.selected?.lrc ?? ''
  const lyricOffset = lyrics.selected?.offset ?? 0
  const origin = report.preprocessing.referenceStart
  const duration = report.preprocessing.referenceDuration
  const cues = useMemo(() => {
    const parsed = parseLrc(lrc)
    return parsed.flatMap((line, index) => {
      const time = line.time + lyricOffset - origin
      const following = parsed[index + 1]
      const until = Math.min(duration, following ? following.time + lyricOffset - origin : duration)
      return line.text && until > 0 && time < until ? [{ text: line.text, time: Math.max(0, time), until }] : []
    })
  }, [lrc, lyricOffset, origin, duration])

  return <Panel className="min-w-0 p-4 sm:p-6" aria-labelledby="pitch-heading">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 id="pitch-heading" className="flex items-center gap-2 font-bold"><Activity size={19} className="text-accent"/> 音高曲线</h2>
      {hasPreview && <label className="flex items-center gap-2 text-xs text-muted">曲线来源
        <select className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-ink"
          value={review ? 'review' : 'harmonic'} onChange={event => setReview(event.currentTarget.value === 'review')}>
          <option value="harmonic">快速基频（谐波）</option><option value="review">音高复核（pYIN）</option>
        </select>
      </label>}
    </div>
    <PitchTransport report={report} playback={playback}/>
    {!mapped && <p className="mb-3 text-xs text-muted">暂无时间对齐结果。两轨同时播放时使用各自的选段起点。</p>}
    <ReportPlot report={report} playback={playback} axis="reference" overlay={mapped} quick={quick} preview={preview} lyrics={cues}/>
    {!mapped && <div className="mt-4">
      <ReportPlot report={report} playback={playback} axis="user" overlay={false} quick={quick} preview={preview}/>
    </div>}
    <ReportLyrics lyrics={lyrics} duration={media.duration} hasCues={cues.length > 0}/>
  </Panel>
}
