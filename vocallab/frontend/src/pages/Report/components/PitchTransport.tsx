import { Pause, Play, Repeat2 } from 'lucide-react'
import type { Report } from '../../../apis/analysis/contracts'
import { GetAnalyzedAudioAPI } from '../../../apis/analysis/GetAnalyzedAudioAPI'
import { Button } from '../../../components/ui/Button'
import type { Playback } from '../hooks/usePlayback'

const tracks = [
  { role: 'reference', name: '原唱', color: 'text-accent accent-[#c1b2ff]' },
  { role: 'user', name: '翻唱', color: 'text-mint accent-[#87e0c8]' },
] as const

export function PitchTransport({ report, playback }: { report: Report; playback: Playback }) {
  const playable = playback.enabled.reference || playback.enabled.user
  return <>
    <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-line pb-3">
      <Button variant="primary" aria-label={playback.playing ? '暂停' : '播放'} onClick={playback.toggle} disabled={!playable}>
        {playback.playing ? <Pause size={16}/> : <Play size={16}/>}
      </Button>
      <div className="flex flex-wrap gap-2" role="group" aria-label="播放音轨">
        {tracks.map(({ role, name, color }) => <label key={role}
          className={`flex cursor-pointer select-none items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-semibold ${color}`}>
          <input type="checkbox" checked={playback.enabled[role]} onChange={event => playback.setTrackEnabled(role, event.currentTarget.checked)}/>
          {name}
        </label>)}
      </div>
      <input aria-label="曲线播放进度" type="range" min={playback.all[0]} max={playback.all[1]} step="any"
        value={playback.time} onChange={event => playback.seek(event.currentTarget.valueAsNumber)} className="min-w-24 flex-1"/>
      {(playback.range.reference || playback.range.user) &&
        <Button aria-pressed={playback.loop} className={playback.loop ? 'border-accent text-accent' : ''}
          onClick={() => playback.setLoop(!playback.loop)}><Repeat2 size={16}/> 循环选区</Button>}
    </div>
    {playback.error && <p className="mb-3 text-sm text-danger" role="alert">{playback.error}</p>}
    {tracks.map(({ role }) => {
      const url = new GetAnalyzedAudioAPI(report.analysisId, role, playback.kinds[role]).url()
      return <audio key={url} data-testid={`pitch-audio-${role}`} ref={playback.players[role]} preload="metadata" src={url}
        onLoadedMetadata={() => playback.loaded(role)} onError={() => playback.audioError(role)}/>
    })}
  </>
}
