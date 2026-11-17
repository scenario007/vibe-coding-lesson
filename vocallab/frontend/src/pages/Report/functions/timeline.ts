import type { HarmonicPitch, PitchTrack, Report, Role } from '../../../apis/analysis/contracts'

export const lowestVisibleMidi = 48 // C3
export const lowestVisibleHz = 440 * 2 ** ((lowestVisibleMidi - 69) / 12)

export type TimeRange = [number, number]
export type ComparisonRange = Record<Role, TimeRange | null>
export type Point = { x: number; midi: number | null; guide: number | null; rms: number; bridge?: number; original: number; hz: number | null }

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

export function harmonicPoints(track: HarmonicPitch, start: number, mapTime = (time: number): number | null => time): Point[] {
  const bridges = new Set(track.bridgedFrames)
  return track.midiPitch.flatMap((midi, i) => {
    const time = i * track.step
    const x = mapTime(time)
    const hz = midi === null ? null : 440 * 2 ** ((midi - 69) / 12)
    if (x === null) return []
    const point = { x, midi, guide: null, rms: 0, original: time + start, hz }
    return bridges.has(i) && midi !== null ? [{ ...point, bridge: midi, midi: null, hz: null }] : [point]
  })
}

export function points(report: Report, role: Role, harmonic: HarmonicPitch | null = null): Point[] {
  const mapTime = (time: number) => role === 'reference' || !hasPlaybackMapping(report) ? time : translate(report, 'user', time)
  if (harmonic) return harmonicPoints(harmonic, report.pitchTracks[role].originalStart, mapTime)
  const track: PitchTrack = report.pitchTracks[role]
  const series = track.timestamps.flatMap((time, i) => {
    const x = mapTime(time)
    return x === null ? [] : [{ x, midi: track.midiPitch[i], guide: track.guideMidiPitch?.[i] ?? null, rms: track.rms[i], original: time + track.originalStart, hz: track.f0Hz[i] }]
  })
  return connectPitchGaps(series)
}

export function connectPitchGaps(series: Point[]): Point[] {
  const completed = [...series]
  let previous = -1
  for (let i = 0; i < series.length; i++) {
    const right = series[i]
    const end = right.midi ?? right.guide
    if (end === null) continue
    const leftIndex = previous
    previous = i
    if (leftIndex < 0 || i - leftIndex < 2) continue
    const left = series[leftIndex]
    const start = (left.midi ?? left.guide)!
    const gap = right.original - left.original
    if (gap > .48 || Math.abs(end - start) > 5 || right.x - left.x > .75) continue

    const floor = Math.max(.00015, Math.min(left.rms, right.rms) * .16)
    let quietSince: number | null = null
    let crossesPause = false
    for (let j = leftIndex + 1; j < i; j++) {
      const point = series[j]
      quietSince = point.rms >= floor ? null : quietSince ?? series[j-1].original
      if (quietSince !== null && series[j+1].original - quietSince >= .10) {
        crossesPause = true
        break
      }
    }
    if (crossesPause) continue
    for (let j = leftIndex + 1; j < i; j++) {
      const point = series[j]
      const fraction = (point.original - left.original) / gap
      completed[j] = { ...point, bridge: start + (end - start) * fraction }
    }
  }
  return completed
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
