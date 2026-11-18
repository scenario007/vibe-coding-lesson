import { LyricsPicker } from '../../lyrics/LyricsPicker'
import type { LyricsLookup } from '../../lyrics/useLyrics'

export function ReportLyrics({ lyrics, duration, hasCues }: { lyrics: LyricsLookup; duration: number; hasCues: boolean }) {
  const { selected } = lyrics
  return <div className="mt-3 border-t border-line pt-3">
    {selected && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="text-xs text-muted">{selected.track.trackName} · {selected.track.artistName}</p>
      <label className="flex items-center gap-2 text-xs text-muted">歌词偏移（秒）
        <input key={selected.track.id} defaultValue={selected.offset} type="number" min={-3600} max={3600} step={0.1}
          className="w-20 rounded-lg border border-line bg-canvas px-2 py-1 text-ink"
          onChange={event => lyrics.setOffset(event.currentTarget.valueAsNumber)}
          onBlur={event => { if (!event.currentTarget.validity.valid || !event.currentTarget.value) event.currentTarget.value = String(selected.offset) }}/>
      </label>
      {!hasCues && <p className="text-xs text-muted">选段内没有同步歌词，可以调整偏移或更换版本。</p>}
    </div>}
    <details className={selected ? 'mt-2' : ''}>
      <summary className="cursor-pointer text-sm text-accent">{selected ? '更换歌词版本' : '按歌名查询歌词'}</summary>
      <div className="mt-3"><LyricsPicker lyrics={lyrics} duration={duration}/></div>
    </details>
  </div>
}
