import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { lyricsTrack, type LyricsTrack } from '../../apis/lyrics/contracts'
import { SearchLyricsAPI } from '../../apis/lyrics/SearchLyricsAPI'
import { GetLyricsAPI } from '../../apis/lyrics/GetLyricsAPI'
import { parseLrc } from './lrc'

const selection = z.object({ track: lyricsTrack, lrc: z.string(), offset: z.number().min(-3600).max(3600) })
type Selection = z.infer<typeof selection>
type Lookup =
  | { type: 'idle' }
  | { type: 'searching' }
  | { type: 'results'; tracks: LyricsTrack[]; loadingId?: number; error?: string }
  | { type: 'error'; message: string }

export function useLyrics(mediaId: string, duration: number) {
  const key = `vocallab-lyrics:${mediaId}`
  const [selected, setSelected] = useState<Selection | null>(() => {
    try {
      return selection.nullable().parse(JSON.parse(sessionStorage.getItem(key) ?? 'null'))
    } catch { return null }
  })
  const [lookup, setLookup] = useState<Lookup>({ type: 'idle' })
  const [title, setTitle] = useState(selected?.track.trackName ?? '')
  const [artist, setArtist] = useState(selected?.track.artistName ?? '')
  const pending = useRef<AbortController>(null)

  useEffect(() => () => pending.current?.abort(), [])
  useEffect(() => {
    try {
      if (selected) sessionStorage.setItem(key, JSON.stringify(selected))
      else sessionStorage.removeItem(key)
    } catch { /* Lyrics remain accessible until this view is closed. */ }
  }, [key, selected])

  async function search() {
    if (!title.trim()) return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setLookup({ type: 'searching' })
    try {
      const tracks = await new SearchLyricsAPI(title.trim(), artist.trim()).send(controller.signal)
      if (!controller.signal.aborted) setLookup({ type: 'results', tracks: [...tracks].sort((a,b) =>
        Number(b.hasSyncedLyrics) - Number(a.hasSyncedLyrics) ||
        (a.duration ? Math.abs(a.duration-duration) : Infinity) -
        (b.duration ? Math.abs(b.duration-duration) : Infinity)) })
    } catch (error) {
      if (!controller.signal.aborted) setLookup({ type: 'error', message: (error as Error).message })
    }
  }

  async function choose(track: LyricsTrack) {
    if (lookup.type !== 'results') return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    const tracks = lookup.tracks
    setLookup({ type: 'results', tracks, loadingId: track.id })
    try {
      const response = await new GetLyricsAPI(track.id).send(controller.signal)
      if (controller.signal.aborted) return
      const lrc = response.syncedLyrics
      if (!lrc || !parseLrc(lrc).some(line => line.text)) {
        setLookup({ type: 'results', tracks, error: '这个版本没有可用的同步歌词，请试试其他版本。' })
        return
      }
      setSelected({ track, lrc, offset: 0 })
      setLookup({ type: 'idle' })
    } catch (error) {
      if (!controller.signal.aborted) setLookup({ type: 'results', tracks, error: (error as Error).message })
    }
  }

  function clear() {
    pending.current?.abort()
    setSelected(null)
    setLookup({ type: 'idle' })
  }

  function setOffset(offset: number) {
    setSelected(value => value && Number.isFinite(offset) && Math.abs(offset) <= 3600 ? { ...value, offset } : value)
  }

  return { selected, lookup, title, artist, setTitle, setArtist, search, choose, clear, setOffset }
}

export type LyricsLookup = ReturnType<typeof useLyrics>
