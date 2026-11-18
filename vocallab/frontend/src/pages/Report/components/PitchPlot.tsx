import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import type { Role } from '../../../apis/analysis/contracts'
import { Button } from '../../../components/ui/Button'
import { hideShortPitchRuns, lowestVisibleMidi, noteLabel, pitchAt, pitchesConnect, timeLabel, visiblePitch, type Point, type TimeRange } from '../functions/timeline'
import { PitchNoteTooltip } from './PitchNoteTooltip'

const right = 14
const referenceColor = '#c1b2ff'
const userColor = '#87e0c8'
const naturalNotes = new Set([0, 2, 4, 5, 7, 9, 11])
const emptyPoints: Point[] = []
const emptyAnnotations: TimeRange[] = []

export type LyricCue = { time: number; until: number; text: string }

function pathOf(series: Point[], x: (value: number) => number, y: (value: number) => number, guide = false) {
  let previous: Point | null = null
  return series.map(point => {
    const midi = visiblePitch(point, guide)
    if (midi === null) {
      previous = null
      return ''
    }
    const previousMidi = previous && visiblePitch(previous, guide)
    const connected = previous && previousMidi !== null && pitchesConnect(previousMidi, midi, point.x - previous.x)
    previous = point
    const position = `${x(point.x).toFixed(1)},${y(midi).toFixed(1)}`
    return connected ? `L${position}` : `M${position}`
  }).join('')
}

function timeTicks(from: number, to: number, target: number) {
  if (to <= from) return []
  const magnitude = 10 ** Math.floor(Math.log10(target))
  const step = ([1, 2, 5, 10].find(value => value * magnitude >= target) ?? 10) * magnitude
  const start = Math.ceil(from / step) * step
  return Array.from({ length: Math.max(0, Math.floor((to - start) / step) + 1) }, (_, i) => start + i * step)
}

export function PitchPlot({ limits, origin, axis, first, second = emptyPoints, time, selected,
  annotations = emptyAnnotations, scaleSecond, harmonic = false, playing, playable, toggle, scrubStart, scrubEnd, lyrics, seek }: {
  limits: TimeRange; origin: number; axis: Role; first: Point[]; second?: Point[]; time: number
  selected?: TimeRange | null; annotations?: TimeRange[]; scaleSecond?: Point[]; harmonic?: boolean
  playing: boolean; playable: boolean; toggle: () => void
  scrubStart?: () => void; scrubEnd: (time: number | null) => void; lyrics?: LyricCue[]; seek: (time: number) => void
}) {
  const overlay = second !== emptyPoints
  const chart = useRef<HTMLDivElement>(null)
  const plotId = useId()
  const [width, setWidth] = useState(1000)
  const [zoom, setZoom] = useState(1)
  const [hover, setHover] = useState<number | null>(null)
  const [scrub, setScrub] = useState<number | null>(null)
  const drag = useRef<{ id: number; x: number; time: number; moved: boolean } | null>(null)
  const left = width < 460 ? 38 : 54
  const plotWidth = width - left - right
  const height = harmonic ? 560 : 280
  const top = harmonic ? 40 : 20
  const bottom = height - (harmonic ? 72 : 36)
  const center = left + plotWidth / 2
  const span = (Math.min(limits[1] - limits[0], width < 460 ? 8 : 12) || 1) / zoom
  const clamp = (next: number) => Math.max(limits[0], Math.min(limits[1], next))
  const visibleTime = scrub ?? time
  const from = visibleTime - span / 2
  const to = visibleTime + span / 2
  const scale = plotWidth / span
  const block = Math.floor(visibleTime / span) * span
  const shift = left + (block - from) * scale
  const x = (at: number) => left + (at - from) * scale
  const y = (midi: number) => top + (high - midi) * (bottom - top) / (high - low)

  useEffect(() => {
    const element = chart.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(220, Math.floor(entry.contentRect.width))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const firstVisible = useMemo(() => hideShortPitchRuns(first), [first])
  const secondVisible = useMemo(() => hideShortPitchRuns(second), [second])
  const pitches = useMemo(() => {
    const secondForScale = scaleSecond ? hideShortPitchRuns(scaleSecond) : secondVisible
    return [...firstVisible, ...secondForScale].flatMap(point => point.midi ?? point.guide ?? [])
  }, [firstVisible, secondVisible, scaleSecond])
  const low = lowestVisibleMidi
  const high = pitches.length ? Math.max(low + 6, Math.ceil((Math.max(...pitches) + 1) / 3) * 3) : 72
  const ticks = Array.from({ length: high - low + 1 }, (_, index) => low + index).filter(note => naturalNotes.has(note % 12))
  const paths = useMemo(() => {
    const drawX = (at: number) => (at - block) * scale
    const drawY = (midi: number) => top + (high - midi) * (bottom - top) / (high - low)
    return [firstVisible, secondVisible].map(series => {
      const visible = series.filter(point => point.x >= block - span && point.x <= block + 2 * span)
      return { solid: pathOf(visible, drawX, drawY), guide: visible.some(p => p.midi === null && (p.guide !== null || p.bridge !== undefined))
        ? pathOf(visible, drawX, drawY, true) : '' }
    })
  }, [firstVisible, secondVisible, block, scale, span, top, bottom, high, low])

  const hoverTime = hover === null ? null : from + hover * span
  const hoverX = hoverTime === null ? null : x(hoverTime)
  const pitchA = hoverTime === null ? null : pitchAt(firstVisible, hoverTime)
  const pitchB = hoverTime === null ? null : pitchAt(secondVisible, hoverTime)
  const colorA = axis === 'reference' ? referenceColor : userColor
  const hoveredNotes = [
    ...(pitchA === null || pitchA > high ? [] : [{ midi: pitchA, color: colorA }]),
    ...(pitchB === null || pitchB > high ? [] : [{ midi: pitchB, color: userColor }]),
  ]
  const groupNotes = hoveredNotes.length === 2 && Math.abs(y(hoveredNotes[0].midi) - y(hoveredNotes[1].midi)) < 35

  function move(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const current = drag.current
    if (current?.id === event.pointerId) {
      const pixels = event.clientX - current.x
      if (!current.moved && Math.abs(pixels) >= 5) {
        current.moved = true
        scrubStart?.()
        setHover(null)
      }
      if (current.moved) setScrub(clamp(current.time - pixels * width / rect.width / scale))
      return
    }
    if (event.pointerType === 'touch' || playing) return
    const plotX = (event.clientX - rect.left) * width / rect.width
    const plotY = (event.clientY - rect.top) * height / rect.height
    setHover(plotX >= left && plotX <= width - right && plotY >= top && plotY <= bottom ? (plotX - left) / plotWidth : null)
  }

  function finish(event: PointerEvent<SVGSVGElement>, cancelled: boolean) {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    drag.current = null
    setHover(null)
    if (current.moved) {
      const actualWidth = event.currentTarget.getBoundingClientRect().width
      const next = clamp(current.time - (event.clientX - current.x) * width / actualWidth / scale)
      scrubEnd(cancelled ? null : next)
      setScrub(null)
    } else if (!cancelled && playable) toggle()
  }

  return <div className="min-w-0">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-muted">{axis === 'reference' ? '原唱文件时间' : '翻唱文件时间'}</span>
      <div className="flex gap-1.5">
        <Button aria-label="缩小曲线" className="min-h-8 px-2" disabled={zoom === .25} onClick={() => { setHover(null); setZoom(Math.max(.25, zoom / 2)) }}><Minus size={15}/></Button>
        <Button aria-label="放大曲线" className="min-h-8 px-2" disabled={zoom === 16} onClick={() => { setHover(null); setZoom(Math.min(16, zoom * 2)) }}><Plus size={15}/></Button>
        <Button aria-label="曲线重置" className="min-h-8 px-2" disabled={zoom === 1} onClick={() => { setHover(null); setZoom(1) }}><Maximize2 size={14}/></Button>
      </div>
    </div>
    <div ref={chart} className="relative rounded-xl border border-line bg-[#12151c]">
      <div className="relative rounded-[inherit]">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img"
          aria-label={overlay ? '原唱与翻唱对齐音高曲线' : '独立音高曲线'}
          className={`w-full touch-pan-y rounded-[inherit] ${scrub === null ? 'cursor-grab' : 'cursor-grabbing'} ${harmonic ? 'h-[490px] sm:h-[600px]' : 'h-[245px] sm:h-[300px]'}`}
          onPointerDown={event => {
            if (event.button !== 0 || !event.isPrimary) return
            drag.current = { id: event.pointerId, x: event.clientX, time, moved: false }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={move} onPointerLeave={() => setHover(null)}
          onPointerUp={event => finish(event, false)} onPointerCancel={event => finish(event, true)}
          onLostPointerCapture={event => finish(event, true)}>
          <defs><clipPath id={plotId}><rect x={left} y={top} width={plotWidth} height={bottom - top}/></clipPath></defs>
          {ticks.map(note => <g key={note}>
            <line x1={left} x2={width - right} y1={y(note)} y2={y(note)} stroke={note % 12 === 0 ? '#41485c' : '#2b3040'}/>
            <text x={left - 8} y={y(note) + 4} textAnchor="end" fill="#a5a9ba" fontSize={12}>{noteLabel(note)}</text>
          </g>)}
          {timeTicks(Math.max(from, limits[0]), Math.min(to, limits[1]), span / (width < 460 ? 4 : 6))
            .map(at => <g key={at}>
              <line x1={x(at)} x2={x(at)} y1={top} y2={bottom} stroke="#282d3a"/>
              <text x={x(at)} y={bottom + 20} textAnchor="middle" fill="#a5a9ba" fontSize={12}>{timeLabel(origin + at)}</text>
            </g>)}
          <g clipPath={`url(#${plotId})`}>
            {annotations.filter(([a, b]) => b >= from && a <= to).map(([a, b], index) =>
              <rect key={index} x={x(a)} y={top} width={Math.max(1, x(b) - x(a))} height={bottom - top} fill="#ffab87" opacity={.12}/>)}
            {selected && <rect x={x(selected[0])} y={top} width={x(selected[1]) - x(selected[0])} height={bottom - top} fill={referenceColor} opacity={.13}/>}
            <g data-testid="pitch-background" transform={`translate(${shift} 0)`}>
              {paths.map((path, index) => <path key={index} d={path.guide} fill="none" opacity={.55}
                stroke={index === 0 ? colorA : userColor} strokeWidth={1.2}
                strokeDasharray="3 3" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>)}
              <path data-testid={harmonic ? `harmonic-curve-${axis}` : undefined} d={paths[0].solid} strokeLinecap="round"
                fill="none" stroke={colorA} strokeWidth={2.7} vectorEffect="non-scaling-stroke"/>
              {overlay && <path data-testid={harmonic ? 'harmonic-curve-user' : undefined} d={paths[1].solid} strokeLinecap="round"
                fill="none" stroke={userColor} strokeWidth={1.75} vectorEffect="non-scaling-stroke"/>}
            </g>
            <line data-testid="pitch-playhead" x1={center} x2={center} y1={top} y2={bottom} stroke="#eee8ff" strokeWidth="1.5"/>
            {hoverX !== null && !playing && hoveredNotes.map(note =>
              <circle key={note.color} cx={hoverX} cy={y(note.midi)} r={4} fill={note.color}/>)}
          </g>
        </svg>
        {hoverX !== null && !playing && (groupNotes ?
          <PitchNoteTooltip notes={hoveredNotes} x={hoverX / width * 100} y={y(Math.max(...hoveredNotes.map(note => note.midi))) / height * 100}/> :
          hoveredNotes.map(note =>
            <PitchNoteTooltip key={note.color} notes={[note]} x={hoverX / width * 100} y={y(note.midi) / height * 100}/>))}
      </div>
      {lyrics && lyrics.length > 0 && <div aria-label="歌词时间轴" className="relative -mt-2 mb-2 h-9 overflow-hidden border-t border-line"
        style={{ marginLeft: `${left / width * 100}%`, marginRight: `${right / width * 100}%` }}>
        {lyrics.filter(cue => cue.until > from && cue.time < to).map(cue => {
          const a = Math.max(0, (cue.time - from) / span)
          const b = Math.min(1, (cue.until - from) / span)
          const current = cue.time <= visibleTime && visibleTime < cue.until
          return <button key={cue.time} type="button" title={cue.text} aria-current={current ? 'true' : undefined}
            onClick={() => seek(cue.time)}
            className={`absolute top-1 truncate rounded border-l px-2 py-1 text-left text-xs hover:bg-raised ${current ? 'border-accent font-semibold text-accent' : 'border-line text-muted'}`}
            style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}>{cue.text}</button>
        })}
      </div>}
    </div>
    <div className="mt-2 flex min-h-5 flex-wrap justify-between gap-x-4 text-xs text-muted">
      {hoverTime !== null && !playing && hoveredNotes.length > 0 ?
        <span className="flex flex-wrap gap-x-3 font-mono">
          {timeLabel(origin + hoverTime)}
          {hoveredNotes.map(note => <span key={note.color} style={{ color: note.color }}>
            {noteLabel(note.midi)} · {(440 * 2 ** ((note.midi - 69) / 12)).toFixed(1)} Hz
          </span>)}
        </span> : <span>单击播放或暂停，左右拖动定位。</span>}
      <span className="font-mono" aria-label="曲线播放时间">{timeLabel(origin + visibleTime)}</span>
    </div>
  </div>
}
