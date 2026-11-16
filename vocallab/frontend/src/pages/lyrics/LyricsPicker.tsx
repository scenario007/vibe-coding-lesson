import { Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import type { LyricsLookup } from './useLyrics'

const input = 'mt-1 block w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink'
const clock = (duration: number) => `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`

export function LyricsPicker({ lyrics, duration }: { lyrics: LyricsLookup; duration: number }) {
  const { selected, lookup } = lyrics
  const tracks = lookup.type === 'results' ? lookup.tracks.filter(track => track.hasSyncedLyrics) : []
  return <div className="grid gap-3">
    <form className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={event => {
      event.preventDefault()
      void lyrics.search()
    }}>
      <label className="text-xs text-muted">歌名
        <input className={input} value={lyrics.title} maxLength={120}
          onChange={e => lyrics.setTitle(e.currentTarget.value)}/>
      </label>
      <label className="text-xs text-muted">歌手（选填）
        <input className={input} value={lyrics.artist} maxLength={120}
          onChange={e => lyrics.setArtist(e.currentTarget.value)}/>
      </label>
      <Button type="submit" disabled={!lyrics.title.trim() || lookup.type === 'searching'}>
        <Search size={15}/> {lookup.type === 'searching' ? '查询中…' : '查询歌词'}
      </Button>
    </form>
    <p className="text-xs leading-5 text-muted">查询只向 LRCLIB 发送歌名和歌手。原唱文件时长 {clock(duration)} 用于在本机排序。</p>
    {selected && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-sm">
      <span>已选 {selected.track.trackName} · {selected.track.artistName} · {clock(selected.track.duration)}</span>
      <Button variant="text" className="min-h-8" onClick={lyrics.clear}>移除歌词</Button>
    </div>}
    {lookup.type === 'error' && <p role="alert" className="text-sm text-danger">{lookup.message}</p>}
    {lookup.type === 'results' && <>
      {lookup.error && <p role="alert" className="text-sm text-danger">{lookup.error}</p>}
      {!tracks.length ? <p role="status" className="text-sm text-muted">没有找到带时间轴的歌词，可以换歌名或歌手写法再查。</p> :
      <ul aria-label="同步歌词版本" className="grid max-h-64 gap-2 overflow-auto">
        {tracks.map(track => <li key={track.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-3 py-2">
          <span className="min-w-0 text-sm">
            <span className="block break-words font-semibold">{track.trackName} · {track.artistName}</span>
            <span className="mt-1 block text-xs text-muted">{[track.albumName, track.duration ? clock(track.duration) : null, `记录 ${track.id}`].filter(Boolean).join(' · ')}</span>
          </span>
          <Button className="min-h-8 shrink-0" disabled={lookup.loadingId !== undefined}
            onClick={() => void lyrics.choose(track)}>{lookup.loadingId === track.id ? '读取中…' : '选用'}</Button>
        </li>)}
      </ul>}
    </>}
  </div>
}
