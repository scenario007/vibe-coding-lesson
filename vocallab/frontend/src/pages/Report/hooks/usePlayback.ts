import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Report, Role, TrackKind } from '../../../apis/analysis/contracts'
import { duration, pairRange, playbackTime, type ComparisonRange, type TimeRange } from '../functions/timeline'

const roles = ['reference', 'user'] as const
const clamp = (time: number, [start, end]: TimeRange) => Math.max(start, Math.min(end, time))

export function usePlayback(report: Report) {
  const reference = useRef<HTMLAudioElement>(null)
  const user = useRef<HTMLAudioElement>(null)
  const players = useMemo(() => ({ reference, user }), [reference, user])
  const [enabled, setEnabled] = useState({ reference: true, user: false })
  const [kinds, setKinds] = useState<Record<Role, TrackKind>>({
    reference: report.separation.reference.inputTrack, user: report.separation.user.inputTrack,
  })
  const bounds = useMemo(() => ({
    reference: [0, duration(report, 'reference')] as TimeRange,
    user: [playbackTime(report, 'user', 0), playbackTime(report, 'user', duration(report, 'user'))] as TimeRange,
  }), [report])
  const all: TimeRange = [Math.min(0, bounds.user[0]), Math.max(bounds.reference[1], bounds.user[1])]
  const [time, setTime] = useState(0)
  const cursor = useRef(0)
  const clock = useRef({ time: 0, at: 0 })
  const running = useRef(false)
  const scrubbing = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const blocked = useRef(new Set<Role>())
  const previousReport = useRef(report)
  const [selection, setSelection] = useState<{ role: Role; times: TimeRange } | null>(null)
  const range = useMemo<ComparisonRange>(() => selection
    ? pairRange(report, selection.role, selection.times) : { reference: null, user: null }, [report, selection])
  const [loop, setLoop] = useState(false)

  const loopRange: TimeRange | null = loop && selection ? [
    selection.role === 'reference' ? selection.times[0] : playbackTime(report, 'user', selection.times[0]),
    selection.role === 'reference' ? selection.times[1] : playbackTime(report, 'user', selection.times[1]),
  ] : null

  function playable(tracks: typeof enabled): TimeRange | null {
    if (tracks.reference && tracks.user) return all
    if (tracks.reference) return bounds.reference
    if (tracks.user) return bounds.user
    return null
  }

  const sync = useCallback((at: number, tracks: typeof enabled, play: boolean, seek: boolean | Role = false) => {
    for (const role of roles) {
      const audio = players[role].current
      if (!audio) continue
      const local = role === 'reference' ? at : playbackTime(report, 'reference', at)
      const limit = duration(report, role)
      const audible = tracks[role] && local >= -1e-6 && local < limit
      if ((!audible || !play) && !audio.paused) audio.pause()
      const force = seek === true || seek === role
      const target = Math.max(0, Math.min(limit, Number.isFinite(audio.duration) ? audio.duration : limit, local))
      if (force && Math.abs(audio.currentTime - target) > .005) audio.currentTime = target
      if (audible && play && !blocked.current.has(role)) {
        if (audio.readyState >= 1 && !audio.seeking && !force && Math.abs(target - audio.currentTime) > .09) {
          audio.currentTime = target
        }
        if (audio.paused && !audio.ended) {
          void audio.play().catch((cause: DOMException) => {
            if (cause.name === 'AbortError') return
            blocked.current.add(role)
            setError('有音轨无法播放。请再点一次播放，或切换音源。')
          })
        }
      }
    }
  }, [players, report])

  function update(at: number, applySeek = false) {
    cursor.current = at
    if (applySeek) clock.current = { time: at, at: performance.now() }
    setTime(at)
  }

  function stop(tracks = enabled) {
    running.current = false
    setPlaying(false)
    sync(cursor.current, tracks, false)
  }

  function seek(at: number) {
    const next = clamp(at, all)
    update(next, true)
    sync(next, enabled, running.current, true)
  }

  function position(role: Role, local: number) {
    seek(role === 'reference' ? local : playbackTime(report, 'user', local))
  }

  function toggle() {
    if (running.current) {
      stop()
      return
    }
    const ready = playable(enabled)
    if (!ready) return
    const interval = loopRange
      ? [Math.max(ready[0], loopRange[0]), Math.min(ready[1], loopRange[1])] as TimeRange : ready
    const limits = interval[1] > interval[0] ? interval : ready
    const next = cursor.current < limits[0] || cursor.current >= limits[1] - .002 ? limits[0] : cursor.current
    blocked.current.clear()
    setError('')
    update(next, true)
    running.current = true
    setPlaying(true)
    sync(next, enabled, true, true)
  }

  function setTrackEnabled(role: Role, checked: boolean) {
    const next = { ...enabled, [role]: checked }
    setEnabled(next)
    blocked.current.delete(role)
    if (!playable(next)) {
      stop(next)
      return
    }
    sync(cursor.current, next, running.current, checked ? role : false)
  }

  function selectTrack(role: Role, kind: TrackKind) {
    const audio = players[role].current
    audio?.pause()
    blocked.current.delete(role)
    setError('')
    setKinds(previous => ({ ...previous, [role]: kind }))
  }

  useEffect(() => {
    if (previousReport.current === report) return
    previousReport.current = report
    sync(cursor.current, enabled, running.current, true)
  }, [enabled, report, sync])

  const ready = playable(enabled)
  const start = ready?.[0] ?? 0
  const end = ready?.[1] ?? 0
  const loopStart = loopRange ? Math.max(start, loopRange[0]) : 0
  const loopEnd = loopRange ? Math.min(end, loopRange[1]) : 0
  useEffect(() => {
    if (!playing) return
    let frame = 0
    function tick(now: number) {
      if (!running.current) return
      if (scrubbing.current) {
        frame = requestAnimationFrame(tick)
        return
      }
      let next = clock.current.time + (now - clock.current.at) / 1000
      if (loopEnd > loopStart && next >= loopEnd) {
        next = loopStart
        update(next, true)
        sync(next, enabled, true, true)
      } else if (next >= end) {
        update(end)
        running.current = false
        setPlaying(false)
        sync(end, enabled, false, true)
        return
      } else {
        update(next)
        sync(next, enabled, true)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled, end, loopEnd, loopStart, playing, sync])

  const local = playbackTime(report, 'reference', time)
  const times = { reference: clamp(time, bounds.reference), user: Math.max(0, Math.min(duration(report, 'user'), local)) }

  return {
    time, times, bounds, all, enabled, kinds, players, range, loop, playing, error,
    toggle, seek, position, selectTrack, setTrackEnabled, setLoop,
    beginScrub: () => {
      scrubbing.current = true
      sync(cursor.current, enabled, false)
    },
    endScrub: (role: Role, at: number | null) => {
      scrubbing.current = false
      if (at === null) seek(cursor.current)
      else position(role, at)
    },
    setRange: (role: Role, times: TimeRange) => setSelection({ role, times }),
    selectRange: (next: ComparisonRange, target: Role) => {
      const selected = next[target]
      if (selected) {
        setSelection({ role: target, times: selected })
        position(target, selected[0])
      }
    },
    loaded: (role: Role) => sync(cursor.current, enabled, running.current, role),
    audioError: (role: Role) => {
      blocked.current.add(role)
      setError(`无法读取${role === 'reference' ? '原唱' : '翻唱'}音轨。`)
    },
  }
}

export type Playback = ReturnType<typeof usePlayback>
