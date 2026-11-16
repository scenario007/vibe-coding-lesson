import { CircleAlert, ShieldCheck } from 'lucide-react'
import type { Report } from '../../../apis/analysis/contracts'
import { Panel } from '../../../components/ui/Panel'

const summaries = [
  ['pitchHitRate', '音准命中率', '偏差在 ±50 cent 内'],
  ['meanAbsoluteCents', '平均绝对偏差', '参与比较的有效音高帧'],
  ['matchedCoverage', '有效匹配覆盖率', '原唱有效帧中找到对应音高的比例'],
  ['highContinuity', '高音有声连续性', '参考相对高音区间内的有效比例'],
] as const

export function Overview({ report }: { report: Report }) {
  const assessment = !report.alignment.reliable || report.confidence < .48 ? '偏低' : report.confidence < .75 ? '中等' : '较高'
  const confidenceColor = assessment === '偏低' ? 'text-danger' : assessment === '中等' ? 'text-accent' : 'text-mint'
  const metric = (name: string) => report.metrics.find(item => item.name === name)
  const ratio = (value: number | null | undefined) => value === null || value === undefined ? '—' : `${(value*100).toFixed(1)}%`
  const timing = metric('medianTimingDeviation')?.value
  return <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {summaries.map(([name, label, detail]) => {
        const item = metric(name)
        const value = item?.value
        return <Panel key={name} className="min-w-0 p-3.5 sm:p-4">
          <h2 className="text-xs leading-5 text-muted">{label}</h2>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-ink" aria-label={label}>
            {item?.unit === 'cent' && value !== undefined && value !== null ? `${value.toFixed(1)}¢` : ratio(value)}
          </p>
          <p className="mt-1.5 text-[11px] leading-4 text-muted">{value === null || value === undefined ? '可用数据不足' : detail}</p>
          {item && value !== null && <p className="mt-1 text-[11px] text-muted">{item.validFrames} 帧</p>}
        </Panel>
      })}
      <Panel className="col-span-2 p-3.5 sm:p-4 lg:col-span-1">
        <h2 className="flex items-center gap-2 text-xs leading-5 text-muted"><ShieldCheck size={14}/> 分析可信度</h2>
        <p className={`mt-1 text-2xl font-semibold ${confidenceColor}`}>{assessment}</p>
        <p className="mt-1.5 text-[11px] leading-4 text-muted">综合对齐、音高与信号质量</p>
      </Panel>
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 py-2 text-xs text-muted">
      <span>原唱有效 F0 {ratio(metric('referenceF0Coverage')?.value)}</span>
      <span>我的演唱有效 F0 {ratio(metric('userF0Coverage')?.value)}</span>
      <span>近似时间偏差 {timing === null || timing === undefined ? '—' : `${Math.round(timing*1000)} ms`}</span>
      {Boolean(report.alignment.transposeSemitones) && <span className="text-accent">可能整体移调 {report.alignment.transposeSemitones} 半音 · 补偿后命中率 {ratio(metric('transposedHitRate')?.value)}</span>}
    </div>
    {report.warnings.length > 0 && <Panel className="flex items-start gap-3 border-[#59433e] bg-[#242020] p-4">
      <CircleAlert size={18} className="mt-0.5 shrink-0 text-danger"/>
      <div><h2 className="text-sm font-semibold">分析提示</h2>
      <ul className="mt-1 space-y-1 text-xs leading-5 text-muted">{report.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>
    </Panel>}
  </>
}
