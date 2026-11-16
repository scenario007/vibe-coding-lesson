import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Activity, Maximize2, Minus, Plus } from 'lucide-react'
import type { Report, Role } from '../../../apis/analysis/contracts'
import { Button } from '../../../components/ui/Button'
import { Panel } from '../../../components/ui/Panel'
import { closest, duration, noteLabel, points, timeLabel, translate, type Point } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'

const H = 280, R = 14, T = 20, B = 36
const height = H-T-B
const referenceColor = '#c1b2ff'
const userColor = '#87e0c8'
const maxZoom = 16

function pathOf(series: Point[], x: (value: number) => number, y: (value: number) => number) {
  let prior: number | null = null
  return series.map(point => {
    if (point.midi === null) { prior = null; return '' }
    const command = prior === null || point.x - prior > .10 ? 'M' : 'L'
    prior = point.x
    return `${command}${x(point.x).toFixed(1)},${y(point.midi).toFixed(1)}`
  }).join('')
}

function Plot({ report, playback, axis, overlay }: { report: Report; playback: Playback; axis: Role; overlay: boolean }) {
  const total = duration(report, axis)
  const start = report.pitchTracks[axis].originalStart
  const chart = useRef<HTMLDivElement>(null)
  const [W, setWidth] = useState(1000)
  const L = W < 460 ? 38 : 54
  const width = W-L-R
  const horizontalTicks = W < 460 ? 4 : 6
  useEffect(() => {
    const element = chart.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(220, Math.floor(entry.contentRect.width))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const [zoom, setZoom] = useState(1)
  const [left, setLeft] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const domain = total / zoom
  const min = Math.min(left, total-domain)
  const max = min + domain
  const [first, second] = useMemo(() => [points(report, axis), overlay ? points(report, 'user') : []], [report, axis, overlay])
  const pitches = useMemo(() => [...first, ...second].flatMap(p => p.midi === null ? [] : [p.midi]), [first, second])
  const low = pitches.length ? Math.floor((Math.min(...pitches)-1) / 3)*3 : 48
  const high = pitches.length ? Math.max(low+6, Math.ceil((Math.max(...pitches)+1)/3)*3) : 72
  const interval = Math.max(3, Math.ceil((high-low)/21)*3)
  const ticks = Array.from({ length: Math.floor((high-low)/interval)+1 }, (_, i) => low + i*interval)
  const x = (time: number) => L + (time-min)*width/domain
  const y = (midi: number) => T + (high-midi)*height/(high-low)
  const path1 = pathOf(first.filter(point => point.x >= min-.12 && point.x <= max+.12), x, y)
  const path2 = pathOf(second.filter(point => point.x >= min-.12 && point.x <= max+.12), x, y)
  const activeTime = playback.active === axis ? playback.time : translate(report, playback.active, playback.time)
  const selected = playback.range[axis]
  const selectionStart = selected?.[0]
  useEffect(() => {
    if (selectionStart === undefined || zoom <= 1) return
    setLeft(previous => {
      const visible = Math.min(previous, total-domain)
      return selectionStart >= visible && selectionStart <= visible + domain ?
        previous : Math.max(0, Math.min(total-domain, selectionStart-domain*.18))
    })
  }, [selectionStart, total, domain, zoom])
  const plotId = `pitch-clip-${axis}`
  const sampleA = hover === null ? undefined : closest(first, hover)
  const sampleB = hover === null ? undefined : closest(second, hover)

  function resizeView(next: number) {
    const center = activeTime !== null && activeTime >= min && activeTime <= max ? activeTime : min + domain / 2
    const newWidth = total / next
    setZoom(next)
    setLeft(next === 1 ? 0 : Math.max(0, Math.min(total-newWidth, center-newWidth/2)))
  }

  function coordinate(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(1, ((event.clientX-rect.left) / rect.width * W - L)/width))
  }

  return <div className="min-w-0">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-muted">{axis === 'reference' ? '原唱文件时间' : '我的演唱文件时间'}</span>
      <div className="flex gap-1.5">
        <Button aria-label="缩小曲线" className="min-h-8 px-2" disabled={zoom===1} onClick={() => resizeView(Math.max(1, zoom/2))}><Minus size={15}/></Button>
        <Button aria-label="放大曲线" className="min-h-8 px-2" disabled={zoom===maxZoom} onClick={() => resizeView(Math.min(maxZoom, zoom*2))}><Plus size={15}/></Button>
        <Button aria-label="曲线重置" className="min-h-8 px-2" disabled={zoom===1} onClick={() => resizeView(1)}><Maximize2 size={14}/></Button>
      </div>
    </div>
    <div ref={chart} className="overflow-hidden rounded-xl border border-line bg-[#12151c]">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`h-[245px] w-full sm:h-[300px] ${zoom>1 ? 'touch-pan-y cursor-grab' : 'cursor-crosshair'}`}
        role="img" aria-label={overlay ? '原唱与我的演唱对齐音高曲线' : '独立音高曲线'}
        onPointerDown={e => {
          if (e.button !== 0) return
          drag.current = { x: coordinate(e), left: min, moved: false }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={e => {
          const f = coordinate(e)
          if (drag.current && zoom > 1 && (drag.current.moved || Math.abs(drag.current.x-f) > .015)) {
            setLeft(Math.max(0, Math.min(total-domain, drag.current.left + (drag.current.x-f)*domain)))
            drag.current.moved = true
            setHover(null)
          } else setHover(min+f*domain)
        }}
        onPointerLeave={() => setHover(null)}
        onPointerUp={e => {
          if (drag.current && !drag.current.moved) playback.position(axis, min + coordinate(e)*domain)
          drag.current = null
        }}
        onPointerCancel={() => { drag.current = null }}>
        <defs><clipPath id={plotId}><rect x={L} y={T} width={width} height={height}/></clipPath></defs>
        {ticks.map(tick => <g key={tick}>
          <line x1={L} x2={W-R} y1={y(tick)} y2={y(tick)} stroke="#2b3040" strokeDasharray="3 4"/>
          <text x={L-8} y={y(tick)+4} textAnchor="end" fill="#969bb0" fontSize={12}>{noteLabel(tick)}</text>
        </g>)}
        {Array.from({ length: horizontalTicks }, (_, i) => min + i*domain/(horizontalTicks-1)).map((time, i) => <g key={i}>
          <line x1={x(time)} x2={x(time)} y1={T} y2={H-B} stroke="#282d3a"/>
          <text x={x(time)} y={H-12} textAnchor={i===horizontalTicks-1 ? 'end' : i===0 ? 'start' : 'middle'} fill="#a5a9ba" fontSize={12}>{timeLabel(start+time)}</text>
        </g>)}
        <g clipPath={`url(#${plotId})`}>
          {report.segments.map((segment, index) => {
            const a = axis === 'reference' ? segment.referenceStart : segment.userStart
            const b = axis === 'reference' ? segment.referenceEnd : segment.userEnd
            return a !== null && b !== null && <rect key={index} x={x(a-start)} y={T} width={Math.max(1, x(b-start)-x(a-start))} height={height} fill="#ffab87" opacity={.12}/>
          })}
          {selected && <rect x={x(selected[0])} y={T} width={x(selected[1])-x(selected[0])} height={height} fill={referenceColor} opacity={.13}/>}
          <path d={path1} fill="none" stroke={axis === 'reference' ? referenceColor : userColor} strokeWidth={2.7} vectorEffect="non-scaling-stroke"/>
          <path d={path2} fill="none" stroke={userColor} strokeWidth={1.75} vectorEffect="non-scaling-stroke"/>
          {activeTime !== null && <line x1={x(activeTime)} x2={x(activeTime)} y1={T} y2={H-B} stroke="#eee8ff" opacity={.75}/>}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H-B} stroke="#9da3b4" strokeDasharray="5 4"/>}
          {sampleA?.midi !== null && sampleA && <circle cx={x(sampleA.x)} cy={y(sampleA.midi)} r={4} fill={axis === 'reference' ? referenceColor : userColor}/>}
          {sampleB?.midi !== null && sampleB && <circle cx={x(sampleB.x)} cy={y(sampleB.midi)} r={4} fill={userColor}/>}
        </g>
      </svg>
    </div>
    <div className="mt-2 flex min-h-6 flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted" aria-live="off">
      {hover === null ? <span>断线表示静音或未检测到可靠音高。点击定位，放大后拖动查看。</span> :
        <><span>{timeLabel(start+hover)}</span><span className={axis==='reference' ? 'text-accent' : 'text-mint'}>{sampleA?.hz && sampleA.midi !== null ? `${noteLabel(sampleA.midi)} · ${sampleA.hz.toFixed(1)} Hz` : '音高不可用'}</span>
          {overlay && <span className="text-mint">{sampleB?.hz && sampleB.midi !== null ? `我的演唱 ${noteLabel(sampleB.midi)} · ${sampleB.hz.toFixed(1)} Hz` : '我的演唱音高不可用'}</span>}</>}
    </div>
    {zoom > 1 && <label className="mt-2 flex items-center gap-4 text-xs text-muted">移动视图
      <input type="range" min={0} max={total-domain} step="any" value={min} onChange={e => setLeft(e.currentTarget.valueAsNumber)} className="min-w-0 flex-1"/>
    </label>}
  </div>
}

export function PitchChart({ report, playback }: { report: Report; playback: Playback }) {
  const reliable = report.alignment.reliable
  return <Panel className="p-4 sm:p-6" aria-labelledby="pitch-heading">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="pitch-heading" className="flex items-center gap-2 font-bold"><Activity size={19} className="text-accent"/> 音高曲线</h2>
      <p className="mt-1.5 text-xs leading-5 text-muted">{reliable ? '以原唱时间为坐标，绿色曲线按乐句对齐，保留我的实际音高。' :
        '匹配可信度不足，两条曲线使用各自的原始时间。'}</p></div>
      <div className="flex gap-4 text-xs font-medium"><span className="text-accent">● 原唱</span><span className="text-mint">● 我的演唱</span></div>
    </div>
    <Plot report={report} playback={playback} axis="reference" overlay={reliable}/>
    {!reliable && <div className="mt-4"><Plot report={report} playback={playback} axis="user" overlay={false}/></div>}
  </Panel>
}
