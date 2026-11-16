import type { PitchTrack, Report, Role } from '../../../apis/analysis/contracts'

export type TimeRange = [number, number]
export type ComparisonRange = Record<Role, TimeRange | null>
export type Point = { x: number; midi: number | null; original: number; hz: number | null }

export function duration(report: Report, role: Role) {
  return role === 'reference' ? report.preprocessing.referenceDuration : report.preprocessing.userDuration
}

export function hasPlaybackMapping(report: Report) {
  const alignment = report.alignment
  return alignment.timeMapping.length >= 2 &&
    (alignment.reliable || alignment.method === 'manual' || alignment.method === 'guide')
}

export function translate(report: Report, from: Role, time: number): number | null {
  if (!hasPlaybackMapping(report)) return null
  const map = report.alignment.timeMapping
  const source = from === 'reference' ? 0 : 1
  if (!map.length || time < map[0][source] - .0001 || time > map.at(-1)![source] + .0001) return null
  let low = 0
  let high = map.length - 1
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2)
    if (map[middle][source] <= time) low = middle
    else high = middle
  }
  const [a, b] = [map[low], map[high]]
  const fraction = (Math.min(b[source], Math.max(a[source], time)) - a[source]) / (b[source] - a[source])
  return a[1-source] + fraction * (b[1-source] - a[1-source])
}

export function pairRange(report: Report, from: Role, range: TimeRange): ComparisonRange {
  const to = from === 'reference' ? 'user' : 'reference'
  const left = translate(report, from, range[0])
  const right = translate(report, from, range[1])
  return { reference: null, user: null, [from]: range, [to]: left !== null && right !== null ? [left, right] : null }
}

export function points(report: Report, role: Role): Point[] {
  const track: PitchTrack = report.pitchTracks[role]
  return track.timestamps.flatMap((time, i) => {
    const x = role === 'reference' || !hasPlaybackMapping(report) ? time : translate(report, 'user', time)
    return x === null ? [] : [{ x, midi: track.midiPitch[i], original: time + track.originalStart, hz: track.f0Hz[i] }]
  })
}

export function closest<T extends { x: number }>(series: T[], x: number): T | undefined {
  if (x < (series[0]?.x ?? Infinity) - .04 || x > (series.at(-1)?.x ?? -Infinity) + .04) return undefined
  let start = 0
  let end = series.length - 1
  while (end - start > 1) {
    const mid = Math.floor((start + end) / 2)
    if (series[mid].x >= x) end = mid
    else start = mid
  }
  return Math.abs(series[start].x - x) <= Math.abs(series[end].x - x) ? series[start] : series[end]
}

export function timeLabel(time: number) {
  const rounded = Math.round(Math.max(0, time) * 100)
  const minutes = Math.floor(rounded / 6000)
  const seconds = (rounded % 6000) / 100
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
}
export function noteLabel(midi: number) {
  const pitch = Math.round(midi)
  const chroma = ((pitch % 12) + 12) % 12
  return `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][chroma]}${Math.floor(pitch / 12) - 1}`
}
