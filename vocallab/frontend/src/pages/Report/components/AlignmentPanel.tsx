import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { Report } from '../../../apis/analysis/contracts'
import { Button } from '../../../components/ui/Button'
import { Panel } from '../../../components/ui/Panel'
import { duration, hasPlaybackMapping, timeLabel } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'

export function AlignmentPanel({ report, playback, adjust, adjusting, error }: {
  report: Report; playback: Playback; adjust: (offset: number | null) => void; adjusting: boolean; error: string;
}) {
  const alignment = report.alignment
  const [offset, setOffset] = useState(String(alignment.manualOffset ?? alignment.offset))
  const confidence = !alignment.reliable ? '偏低' : alignment.confidence < .74 ? '中等' : '较高'
  const referenceDuration = duration(report, 'reference')
  const userDuration = duration(report, 'user')
  const fits = (value: number) => Number.isFinite(value) &&
    Math.min(referenceDuration, userDuration - value) - Math.max(0, -value) >= .1
  const valid = offset.trim() !== '' && fits(Number(offset))
  const anchorOffset = Number((playback.times.user - playback.times.reference).toFixed(2))
  return <Panel className="p-4 sm:p-6">
    <h2 className="flex items-center gap-2 font-bold"><SlidersHorizontal size={18} className="text-accent"/> 时间对齐与方法</h2>
    <p className="mt-3 text-xs leading-6 text-muted">{hasPlaybackMapping(report) ? `当前偏移 ${alignment.offset.toFixed(2)} 秒` : '暂无可靠的自动偏移'} · 匹配可信度{confidence}。正值表示我的演唱比原唱晚开始。手动设置固定偏移，保持两轨原始速度。</p>
    <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={e => {
      e.preventDefault()
      if (valid) adjust(Number(offset))
    }}>
      <label className="text-xs text-muted">手动偏移（秒）
        <input value={offset} onChange={e => setOffset(e.currentTarget.value)} min={-referenceDuration} max={userDuration} step={.01}
          type="number" className="mt-1.5 block w-34 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-ink"/>
      </label>
      <Button type="submit" disabled={!valid || adjusting}>重新对齐</Button>
      {alignment.manualOffset !== null && <Button variant="text" disabled={adjusting} onClick={() => adjust(null)}>恢复自动</Button>}
    </form>
    <div className="mt-3 rounded-lg border border-line bg-canvas p-3">
      <p className="text-xs leading-5 text-muted">在 A、B 各找同一句的起点，再用当前位置对齐。</p>
      <p className="mt-1 font-mono text-xs text-muted">
        A {timeLabel(report.preprocessing.referenceStart + playback.times.reference)}
        {' · '}B {timeLabel(report.preprocessing.userStart + playback.times.user)}
      </p>
      <Button className="mt-2" disabled={adjusting || !fits(anchorOffset)} onClick={() => adjust(anchorOffset)}>用两轨当前位置对齐</Button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    <details className="mt-4 border-t border-line pt-3">
      <summary className="cursor-pointer text-xs font-semibold">计算方法与局限</summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-5 text-muted">
        <li>pYIN 以 {report.preprocessing.sampleRate} Hz 单声道估计基频。缺少可靠基频的帧从音准指标中剔除。</li>
        <li>±50 cent 是本版比较阈值。音高与节奏指标基于两段录音的对应帧，节奏偏差反映估计的时间轴偏移。</li>
        <li>长音用分块中位数估计慢漂移。清晰颤音、滑音、和声、弱音及分离伪影会影响估计。</li>
        <li>报告描述声学现象。发声方式与技术原因需结合听辨和实际演唱评估。</li>
        {(['reference','user'] as const).filter(role => report.separation[role].enabled).map(role =>
          <li key={role}>{role==='reference' ? '原唱' : '我的演唱'}使用 {report.separation[role].model}（{report.separation[role].device?.toUpperCase()}）
            {report.separation[role].cached ? ' · 复用已分离音轨' : ''}</li>)}
      </ul>
    </details>
  </Panel>
}
