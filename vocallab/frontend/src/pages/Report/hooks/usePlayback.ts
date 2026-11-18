import { useEffect, useMemo, useRef, useState } from 'react'
import type { Report, Role, TrackKind } from '../../../apis/analysis/contracts'
import { duration, pairRange, translate, type ComparisonRange, type TimeRange } from '../functions/timeline'

export function usePlayback(report: Report) {
  const [active, setActive] = useState<Role>('reference')
  const [kinds, setKinds] = useState<Record<Role, TrackKind>>({
    reference: report.separation.reference.inputTrack, user: report.separation.user.inputTrack,
  })
  const [times, setTimes] = useState<Record<Role, number>>({ reference: 0, user: 0 })
  const [selection, setSelection] = useState<{ role: Role; times: TimeRange } | null>(null)
  const range = useMemo<ComparisonRange>(() => selection
    ? pairRange(report, selection.role, selection.times) : { reference: null, user: null }, [report, selection])
  const [loop, setLoop] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const player = useRef<HTMLAudioElement>(null)
  const pending = useRef<{ time: number; play: boolean } | null>(null)
  const limit = duration(report, active)

  function jump(time: number, play = false) {
    const value = Math.max(0, Math.min(limit, time))
    setTimes(old => ({ ...old, [active]: value }))
    const audio = player.current
    if (audio && audio.readyState > 0) {
      audio.currentTime = value
      if (play) void audio.play().catch(() => setError('无法开始播放，请再按一次播放。'))
    } else pending.current = { time: value, play }
  }

  function selectRole(next: Role) {
    if (next === active) return
    const current = player.current?.currentTime ?? times[active]
    const mapped = translate(report, active, current)
    pending.current = { time: mapped ?? range[next]?.[0] ?? times[next],
      play: Boolean(player.current && !player.current.paused) }
    setTimes(old => ({ ...old, [active]: current }))
    setError('')
    setPlaying(false)
    setActive(next)
  }

  function selectTrack(next: TrackKind) {
    if (next === kinds[active]) return
    pending.current = { time: player.current?.currentTime ?? times[active], play: Boolean(player.current && !player.current.paused) }
    setError('')
    setPlaying(false)
    setKinds(old => ({ ...old, [active]: next }))
  }

  function loaded() {
    const target = pending.current
    pending.current = null
    if (target) jump(target.time, target.play)
  }

  function selectRange(next: ComparisonRange, target = active) {
    const selected = next[target]
    if (selected) setSelection({ role: target, times: selected })
    if (target !== active) {
      const resume = Boolean(player.current && !player.current.paused)
      pending.current = { time: selected?.[0] ?? times[target], play: resume }
      setActive(target)
    } else if (selected) jump(selected[0])
  }

  function position(from: Role, time: number) {
    const to = from === active ? time : translate(report, from, time)
    if (to !== null) jump(to)
    else {
      pending.current = { time, play: Boolean(player.current && !player.current.paused) }
      setActive(from)
    }
  }

  function play() {
    const audio = player.current
    if (!audio) return
    setError('')
    if (!audio.paused) { audio.pause(); return }
    const selected = range[active]
    if (loop && selected && (audio.currentTime < selected[0] || audio.currentTime >= selected[1])) jump(selected[0])
    void audio.play().catch(() => setError('播放失败，请检查本地音轨。'))
  }

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const update = () => {
      const audio = player.current
      const selected = range[active]
      if (audio) {
        if (loop && selected && audio.currentTime >= selected[1]) audio.currentTime = selected[0]
        const current = audio.currentTime
        setTimes(old => ({ ...old, [active]: current }))
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [active, loop, playing, range])

  return { active, kind: kinds[active], time: times[active], times, range, loop, error, playing, player, loaded,
    play, selectRole, selectTrack, selectRange, jump, position, setPlaying, setLoop, setError,
    changeRange: (times: TimeRange) => setSelection({ role: active, times }),
    ended: () => {
      const selected = range[active]
      if (loop && selected) jump(selected[0], true)
      else { setPlaying(false); setTimes(old => ({ ...old, [active]: limit })) }
    },
  }
}
export type Playback = ReturnType<typeof usePlayback>
