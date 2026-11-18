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
    (alignment.reliable || alignment.method === 'manual' || alignment.method === 'guide' || alignment.method === 'envelope')
}

export function translate(report: Report, from: Role, time: number): number | null {
  if (!hasPlaybackMapping(report)) return null
  const fixedOffset = report.alignment.offsetSeconds
  if (fixedOffset != null) {
    const target = from === 'reference' ? 'user' : 'reference'
    const mapped = from === 'reference' ? time + fixedOffset : time - fixedOffset
    const limit = duration(report, target)
    return mapped < -1e-6 || mapped > limit + 1e-6 ? null : Math.max(0, Math.min(limit, mapped))
  }
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

// Shared playback keeps the original playback speed and extends each clip's
// timeline through its lead-in and tail, even where only one track exists.
export function playbackTime(report: Report, from: Role, time: number): number {
  if (!hasPlaybackMapping(report)) return time
  const fixed = report.alignment.offsetSeconds
  if (fixed != null) return from === 'reference' ? time + fixed : time - fixed
  const mapped = translate(report, from, time)
  if (mapped !== null) return mapped
  const axis = from === 'reference' ? 0 : 1
  const map = report.alignment.timeMapping
  const anchor = time < map[0][axis] ? map[0] : map[map.length - 1]
  return time + anchor[1 - axis] - anchor[axis]
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

export function points(report: Report, role: Role, harmonic: HarmonicPitch | null = null, includeClipTails = false): Point[] {
  const mapped = role === 'user' && hasPlaybackMapping(report)
  const mapTime = (time: number) => !mapped ? time : includeClipTails
    ? playbackTime(report, 'user', time) : translate(report, 'user', time)
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

export function pitchesConnect(a: number, b: number, interval: number) {
  return interval <= .10 && Math.abs(a - b) <= 5
}

export function shortPitchFrames(pitches: readonly (number | null | undefined)[], step: number): Set<number> {
  const hidden = new Set<number>()
  let start = 0
  while (start < pitches.length) {
    const first = pitches[start]
    if (first == null || first < lowestVisibleMidi) {
      start++
      continue
    }
    let end = start + 1
    let previous = first
    while (end < pitches.length) {
      const next = pitches[end]
      if (next == null || next < lowestVisibleMidi || !pitchesConnect(previous, next, step)) break
      previous = next
      end++
    }
    if ((end - start) * step < .05) {
      for (let frame = start; frame < end; frame++) hidden.add(frame)
    }
    start = end
  }
  return hidden
}

export function hideShortPitchRuns(series: Point[]): Point[] {
  if (series.length < 2) return []
  const step = series[1].original - series[0].original
  const hidden = shortPitchFrames(series.map(point => point.midi ?? point.guide ?? point.bridge), step)
  return series.map((point, index) => hidden.has(index)
    ? { ...point, midi: null, hz: null, guide: null, bridge: undefined }
    : point)
}

export function visiblePitch(point: Point, guide = false): number | null {
  const midi = guide ? point.midi ?? point.guide ?? point.bridge ?? null : point.midi
  return midi !== null && midi >= lowestVisibleMidi ? midi : null
}

export function pitchAt(series: Point[], time: number, guide = false): number | null {
  let left = 0
  let right = series.length
  while (left < right) {
    const middle = Math.floor((left + right) / 2)
    if (series[middle].x < time) left = middle + 1
    else right = middle
  }
  const next = series[left]
  if (!next) return null
  const end = visiblePitch(next, guide)
  if (end === null || next.x === time) return end
  const previous = series[left - 1]
  if (!previous) return null
  const start = visiblePitch(previous, guide)
  const gap = next.x - previous.x
  if (start === null || !pitchesConnect(start, end, gap)) return null
  return start + (end - start) * (time - previous.x) / gap
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
