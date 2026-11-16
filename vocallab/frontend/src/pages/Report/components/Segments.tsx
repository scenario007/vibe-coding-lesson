import { AudioLines, ArrowUpRight } from 'lucide-react'
import type { Report, Role, Segment } from '../../../apis/analysis/contracts'
import { Panel } from '../../../components/ui/Panel'
import { timeLabel, type TimeRange } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'

const types: Record<Segment['type'], string> = {
  sharp: '持续偏高', flat: '持续偏低', drift: '缓慢音高漂移', interruption: '长音有声中断',
  high_drop: '高音区间音高下降', high_interruption: '高音有声中断', uncertain_pitch: '音高检测可信度不足',
}
function evidence(item: Segment) {
  const e = item.evidence
  if (e.medianCents !== undefined) return `音高偏差中位数 ${e.medianCents.toFixed(1)} cent`
  if (e.driftCents !== undefined) return `缓慢变化 ${e.driftCents.toFixed(1)} cent · 有效覆盖 ${(e.coverage*100).toFixed(0)}%`
  if (e.missingSeconds !== undefined) return `未检测到连续有声信号 ${e.missingSeconds.toFixed(2)} 秒`
  return `有声概率中位数 ${((e.medianProbability ?? 0)*100).toFixed(0)}% · ${e.frames ?? 0} 帧`
}
function interval(start: number | null, end: number | null) {
  return start === null || end === null ? '—' : `${timeLabel(start)}–${timeLabel(end)}`
}

export function Segments({ report, playback }: { report: Report; playback: Playback }) {
  function range(role: Role, a: number | null, b: number | null): TimeRange | null {
    const origin = report.pitchTracks[role].originalStart
    return a === null || b === null ? null : [Math.max(0, a-origin), Math.max(0,b-origin)]
  }
  return <Panel className="p-4 sm:p-6" aria-labelledby="segments-heading">
    <h2 id="segments-heading" className="flex items-center gap-2 font-bold"><AudioLines size={19} className="text-accent"/> 片段观察 <span className="font-mono text-sm text-muted">{report.segments.length}</span></h2>
    <p className="mt-1.5 text-xs leading-5 text-muted">选择片段即可定位并复听。若检测到整体移调，片段偏差按移调补偿后计算。</p>
    {report.segments.length === 0 ? <p className="mt-3 text-sm text-muted">没有达到片段标记阈值的观察。</p> :
      <ul className="mt-4 grid max-h-[24rem] gap-2 overflow-auto pr-1">
        {report.segments.map((segment, i) => <li key={i}>
          <button className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas px-3.5 py-3 text-left hover:border-accent/70"
            type="button" onClick={() => {
              const reference = range('reference', segment.referenceStart, segment.referenceEnd)
              const user = range('user', segment.userStart, segment.userEnd)
              playback.selectRange({ reference, user }, reference ? 'reference' : 'user')
              playback.setLoop(true)
            }}>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{types[segment.type]}</span>
              <span className="mt-1 block text-xs text-muted">{evidence(segment)} · 可信度 {(segment.confidence*100).toFixed(0)}%</span>
              <span className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs"><span className="text-accent">A {interval(segment.referenceStart, segment.referenceEnd)}</span>
                <span className="text-mint">B {interval(segment.userStart, segment.userEnd)}</span></span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 text-accent"/>
          </button>
        </li>)}
      </ul>}
    {report.phrases.length > 0 && <details className="mt-5 border-t border-line pt-3">
      <summary className="cursor-pointer text-sm font-semibold">长音与相对高音 · {report.phrases.length} 段</summary>
      <ul className="mt-3 max-h-60 space-y-3 overflow-auto text-xs leading-5 text-muted">
        {report.phrases.map((item, i) => <li key={i}>
          <span className="text-ink">{item.type === 'sustained' ? '长音' : '相对高音'} {interval(item.referenceStart,item.referenceEnd)}</span>
          {' · '}有声连续性 {(item.continuity*100).toFixed(0)}% · 缓慢漂移 {item.driftCents === null ? '—' : `${item.driftCents.toFixed(1)} cent`}
          {' · '}偏差中位数 {item.medianCents === null ? '—' : `${item.medianCents.toFixed(1)} cent`}
        </li>)}
      </ul>
    </details>}
  </Panel>
}
