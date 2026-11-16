import { useEffect, useMemo, useRef } from 'react'
import { AudioLines } from 'lucide-react'
import type { Report } from '../../../apis/analysis/contracts'
import { Panel } from '../../../components/ui/Panel'
import { parseLrc } from '../../lyrics/lrc'
import { LyricsPicker } from '../../lyrics/LyricsPicker'
import { useLyrics } from '../../lyrics/useLyrics'
import { timeLabel, translate } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'

export function ReportLyrics({ report, playback }: { report: Report; playback: Playback }) {
  const media = report.referenceMetadata
  const lyrics = useLyrics(media.id, media.duration)
  const { selected } = lyrics
  const start = report.preprocessing.referenceStart
  const end = start + report.preprocessing.referenceDuration
  const lrc = selected?.lrc ?? ''
  const offset = selected?.offset ?? 0
  const lines = useMemo(() => {
    const parsed = parseLrc(lrc)
    return parsed.map((line, index) => ({
      text: line.text, time: line.time + offset,
      until: parsed[index + 1] ? parsed[index + 1].time + offset : Infinity,
    })).filter(line => line.text && line.time < end && line.until > start)
  }, [lrc, offset, start, end])
  const relative = playback.active === 'reference' ? playback.time : translate(report, 'user', playback.time)
  const time = relative === null ? null : start + relative
  const active = time === null ? undefined : lines.find(line => line.time <= time && time < line.until)
  const activeTime = active?.time
  const scroll = useRef<HTMLUListElement>(null)
  const current = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const list = scroll.current
    const row = current.current
    if (activeTime !== undefined && list && row &&
      (row.offsetTop < list.scrollTop || row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)) {
      list.scrollTop = row.offsetTop - list.clientHeight / 3
    }
  }, [activeTime])

  return <Panel className="p-4 sm:p-6" aria-labelledby="lyrics-heading">
    <h2 id="lyrics-heading" className="flex items-center gap-2 font-bold"><AudioLines size={19} className="text-accent"/> 同步歌词</h2>
    {selected && <>
      <p className="mt-2 text-sm text-muted">{selected.track.trackName} · {selected.track.artistName} · <a className="underline" href="https://lrclib.net/">LRCLIB</a></p>
      <label className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">歌词偏移（秒）
        <input key={selected.track.id} defaultValue={offset} type="number" min={-3600} max={3600} step={0.1}
          className="w-24 rounded-lg border border-line bg-canvas px-2 py-1.5 text-ink"
          onChange={event => lyrics.setOffset(event.currentTarget.valueAsNumber)}
          onBlur={event => { if (!event.currentTarget.validity.valid || !event.currentTarget.value) event.currentTarget.value = String(offset) }}/> 正数让歌词晚出现
      </label>
      {relative === null && <p className="mt-3 text-xs text-muted">当前演唱位置没有可靠的原唱对应点。点击歌词可定位原唱。</p>}
      {!lines.length ? <p className="mt-3 text-sm text-muted">选段内没有同步歌词，可以调整歌词偏移或换一个版本。</p> :
        <ul ref={scroll} aria-label="选段歌词" className="relative mt-3 max-h-64 overflow-auto rounded-lg border border-line bg-canvas">
          {lines.map(line => <li key={line.time} ref={line === active ? current : undefined}>
            <button type="button" aria-current={line === active ? 'true' : undefined}
              className={`flex w-full cursor-pointer gap-3 px-3 py-2.5 text-left text-sm hover:bg-raised ${line === active ? 'bg-raised font-semibold text-accent' : 'text-ink'}`}
              onClick={() => playback.position('reference', Math.max(0, line.time - start))}>
              <span className="shrink-0 font-mono text-xs text-muted">{timeLabel(Math.max(start, line.time))}</span>
              <span className="min-w-0 break-words">{line.text}</span>
            </button>
          </li>)}
        </ul>}
    </>}
    <details className="mt-3">
      <summary className="cursor-pointer text-sm text-accent">{selected ? '更换歌词版本' : '按歌名查询歌词'}</summary>
      <div className="mt-3"><LyricsPicker lyrics={lyrics} duration={media.duration}/></div>
    </details>
  </Panel>
}
