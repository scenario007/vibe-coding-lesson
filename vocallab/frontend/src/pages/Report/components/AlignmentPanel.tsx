import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { Report } from '../../../apis/analysis/contracts'
import { Button } from '../../../components/ui/Button'
import { Panel } from '../../../components/ui/Panel'
import { duration, hasPlaybackMapping, timeLabel, type TimeRange } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

function automaticLabel(value: number) {
  if (value === 0) return '自动检测到两轨同步'
  return `自动检测到翻唱${value > 0 ? '延迟' : '提前'} ${signed(value)} 秒`
}

export function AlignmentPanel({ report, playback, adjust, adjusting, error }: {
  report: Report; playback: Playback; adjust: (offset: number | null, range?: TimeRange) => void;
  adjusting: boolean; error: string;
}) {
  const alignment = report.alignment
  const automatic = alignment.automatic
  const applied = alignment.offsetSeconds ?? alignment.offset
  const [offset, setOffset] = useState(() => applied.toFixed(3).replace(/\.?0+$/, '') || '0')
  const referenceDuration = duration(report, 'reference')
  const userDuration = duration(report, 'user')
  const fits = (value: number) => Number.isFinite(value) &&
    Math.min(referenceDuration, userDuration - value) - Math.max(0, -value) >= .1 - 1e-9
  const valid = offset.trim() !== '' && fits(Number(offset))
  const selection = playback.range.reference
  const referenceRange = selection && selection[1] - selection[0] >= 1 &&
    selection[1] <= Math.min(referenceDuration, userDuration) + 1e-9 ? selection : undefined
  const origin = report.preprocessing.referenceStart
  const selectedStart = selection?.[0] ?? 0
  const selectedEnd = selection?.[1] ?? referenceDuration

  function setEndpoint(endpoint: 0 | 1, input: HTMLInputElement) {
    const current = endpoint === 0 ? selectedStart : selectedEnd
    const value = input.valueAsNumber - origin
    if (Number.isFinite(value) && value >= 0 && value <= referenceDuration &&
      (endpoint === 0 ? value < selectedEnd - .03 : value > selectedStart + .03)) {
      playback.setRange('reference', endpoint === 0 ? [value, selectedEnd] : [selectedStart, value])
    } else input.value = String(Number((origin + current).toFixed(2)))
  }
  const range = automatic?.referenceRange
  const confidence = automatic?.reliable ? (automatic.confidence < .74 ? '中等' : '较高') : '偏低'
  return <Panel className="p-4 sm:p-6">
    <h2 className="flex items-center gap-2 font-bold"><SlidersHorizontal size={18} className="text-accent"/> 时间对齐</h2>
    <div className="mt-3 space-y-1 text-xs leading-6 text-muted" aria-live="polite">
      {automatic ? <p>{automatic.offsetSeconds === null ? '自动检测未找到可用偏移' : automaticLabel(automatic.offsetSeconds)}
        {automatic.offsetSeconds !== null && ` · 可信度${confidence}`}
        {range && ` · 原唱选区 ${timeLabel(origin + range[0])}–${timeLabel(origin + range[1])}`}</p>
        : <p>可用两条已处理音轨重新检测偏移。</p>}
      {hasPlaybackMapping(report) && <p>
        当前{alignment.manualOffset !== null ? '手动' : ''}偏移 {signed(applied)} 秒
        {alignment.originalOffsetSeconds != null && Math.abs(alignment.originalOffsetSeconds - applied) >= .005 &&
          ` · 按原始文件时间计 ${signed(alignment.originalOffsetSeconds)} 秒`}
      </p>}
      <p>偏移按选段起点计算，正值表示翻唱晚于原唱。</p>
    </div>
    <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={e => {
      e.preventDefault()
      if (valid) adjust(Number(offset))
    }}>
      <label className="text-xs text-muted">手动偏移（秒）
        <input value={offset} onChange={e => setOffset(e.currentTarget.value)} min={-referenceDuration} max={userDuration} step="any"
          type="number" className="mt-1.5 block w-34 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-ink"/>
      </label>
      <Button type="submit" disabled={!valid || adjusting}>应用偏移</Button>
      {alignment.manualOffset !== null && automatic && <Button variant="text" disabled={adjusting}
        onClick={() => adjust(null, range ?? undefined)}>恢复自动</Button>}
    </form>
    <details className="mt-3 rounded-lg border border-line px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium">原唱复听与检测选区</summary>
      <div className="mt-2 flex flex-wrap gap-3">
        {([0, 1] as const).map(endpoint => {
          const value = Number((origin + (endpoint === 0 ? selectedStart : selectedEnd)).toFixed(2))
          return <label key={endpoint} className="flex items-center gap-2 text-xs text-muted">
            {endpoint === 0 ? '复听起点（秒）' : '复听终点（秒）'}
            <input key={value} type="number" defaultValue={value} step="any" min={origin}
              max={origin + referenceDuration} className="w-24 rounded-lg border border-line bg-canvas px-2 py-1.5 font-mono text-ink"
              onBlur={event => setEndpoint(endpoint, event.currentTarget)}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }}/>
          </label>
        })}
      </div>
    </details>
    <div className="mt-3 flex flex-wrap gap-2">
      {(!automatic || range || alignment.manualOffset !== null) && <Button disabled={adjusting}
        onClick={() => adjust(null)}>用整段自动检测</Button>}
      <Button disabled={adjusting || !referenceRange} onClick={() => adjust(null, referenceRange)}>用原唱选区检测</Button>
    </div>
    {adjusting && <p role="status" className="mt-2 text-xs text-muted">正在更新对齐…</p>}
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    <details className="mt-4 border-t border-line pt-3">
      <summary className="cursor-pointer text-xs font-semibold">计算方法与局限</summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-5 text-muted">
        <li>通过音量包络、强弱变化、起音和休止检测固定偏移。</li>
        <li>音准分使用快速基频。有固定偏移后，可按置信度评估音符。</li>
        <li>演唱速度变化时，同一个偏移在不同位置的效果可能有差异。</li>
        <li>发声方式与技术原因需结合听辨和实际演唱评估。</li>
        {(['reference','user'] as const).filter(role => report.separation[role].enabled).map(role =>
          <li key={role}>{role==='reference' ? '原唱' : '我的演唱'}使用 {report.separation[role].model}（{report.separation[role].device?.toUpperCase()}）
            {report.separation[role].cached ? ' · 复用已分离音轨' : ''}</li>)}
      </ul>
    </details>
  </Panel>
}
