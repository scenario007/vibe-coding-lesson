import { Headphones, Pause, Play, Repeat2 } from 'lucide-react'
import { GetAnalyzedAudioAPI } from '../../../apis/analysis/GetAnalyzedAudioAPI'
import type { Report, Role, TrackKind } from '../../../apis/analysis/contracts'
import { Button } from '../../../components/ui/Button'
import { Panel } from '../../../components/ui/Panel'
import { duration, hasPlaybackMapping, timeLabel } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'

const names: Record<TrackKind, string> = { original: '原始音频', vocals: '分离人声', instrumental: '分离伴奏' }

export function ListenPanel({ report, playback }: { report: Report; playback: Playback }) {
  const role = playback.active
  const available = report.separation[role].outputTracks
  const clipStart = report.pitchTracks[role].originalStart
  const clipEnd = clipStart + duration(report, role)
  const selection = playback.range[role]
  const url = new GetAnalyzedAudioAPI(report.analysisId, role, playback.kind).url()
  function setEndpoint(i: 0 | 1, absolute: number) {
    if (!Number.isFinite(absolute)) return
    const value = Math.min(clipEnd, Math.max(clipStart, absolute)) - clipStart
    const [start, end] = selection ?? [0, duration(report, role)]
    if (i === 0 && value < end - .03) playback.changeRange([value, end])
    if (i === 1 && value > start + .03) playback.changeRange([start, value])
  }

  return <Panel className="p-4 sm:p-6" aria-labelledby="listen-heading">
    <h2 id="listen-heading" className="mb-4 flex items-center gap-2 font-bold"><Headphones size={19} className="text-accent"/> A/B 对照复听</h2>
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-xl border border-line bg-canvas p-1" aria-label="选择录音">
        {(['reference', 'user'] as Role[]).map(option => <Button key={option} variant="text" aria-pressed={role === option}
          onClick={() => playback.selectRole(option)} className={role === option ? 'bg-raised text-ink' : ''}>
          {option === 'reference' ? 'A 原唱' : 'B 我的演唱'}
        </Button>)}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">试听音轨
        <select aria-label="试听音轨" value={playback.kind} onChange={e => playback.selectTrack(e.currentTarget.value as TrackKind)}
          className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink">
          {available.map(kind => <option key={kind} value={kind}>{names[kind]}</option>)}
        </select>
      </label>
      <span className="text-xs text-muted">音高分析使用 {names[report.separation[role].inputTrack]}</span>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button variant="primary" aria-label={playback.playing ? '暂停' : '播放'} onClick={playback.play}>
        {playback.playing ? <Pause size={17}/> : <Play size={17}/>}
      </Button>
      <input aria-label="播放进度" type="range" min={0} max={duration(report, role)} step="any" value={Math.min(duration(report,role),playback.time)}
        className="min-w-28 flex-1" onChange={e => playback.jump(e.currentTarget.valueAsNumber)}/>
      <span className="font-mono text-xs text-muted">{timeLabel(clipStart+playback.time)} / {timeLabel(clipEnd)}</span>
    </div>
    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-3">
      <label className="text-xs text-muted">复听起点（秒）
        <input key={role+'-start'} type="number" min={clipStart} max={clipEnd} step={.01}
          onBlur={e => setEndpoint(0, e.currentTarget.valueAsNumber)}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className="ml-2 w-[5.5rem] rounded-lg border border-line bg-canvas px-2 py-2 font-mono text-ink"
          defaultValue={Math.round((clipStart+(selection?.[0] ?? 0))*100)/100}
          ref={input => { if (input && document.activeElement !== input) input.value = String(Math.round((clipStart+(selection?.[0] ?? 0))*100)/100) }}/>
      </label>
      <label className="text-xs text-muted">复听终点（秒）
        <input key={role+'-end'} type="number" min={clipStart} max={clipEnd} step={.01}
          onBlur={e => setEndpoint(1, e.currentTarget.valueAsNumber)}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className="ml-2 w-[5.5rem] rounded-lg border border-line bg-canvas px-2 py-2 font-mono text-ink"
          defaultValue={Math.round((clipStart+(selection?.[1] ?? duration(report,role)))*100)/100}
          ref={input => { if (input && document.activeElement !== input) input.value = String(Math.round((clipStart+(selection?.[1] ?? duration(report,role)))*100)/100) }}/>
      </label>
      <Button aria-pressed={playback.loop} className={playback.loop ? 'border-accent text-accent' : ''}
        onClick={() => {
          if (!selection) playback.changeRange([0, duration(report, role)])
          playback.setLoop(!playback.loop)
        }}><Repeat2 size={16}/> 循环区间</Button>
    </div>
    <p className="mt-3 text-xs leading-5 text-muted">{hasPlaybackMapping(report) ? '切换 A/B 时按时间映射跳到对应位置。有效映射以外可单独试听。' :
      '两段录音使用独立播放位置。可分别定位同一句，再在下方用两轨位置对齐。'}</p>
    {playback.error && <p className="mt-2 text-sm text-danger" role="alert">{playback.error}</p>}
    <audio key={url} ref={playback.player} preload="metadata" src={url} onLoadedMetadata={playback.loaded}
      onPlaying={() => playback.setPlaying(true)} onPause={() => playback.setPlaying(false)} onEnded={playback.ended}
      onError={() => playback.setError('无法读取此音轨。报告或媒体可能已过期。')}/>
  </Panel>
}
