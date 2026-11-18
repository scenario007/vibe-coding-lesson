import { useState } from 'react'
import type { Report } from '../../../apis/analysis/contracts'
import type { CoachView, Difficulty, Observation, ResearchSource } from '../../../apis/coach/contracts'
import { Button } from '../../../components/ui/Button'
import { citations, metricLabel, statuses } from '../functions/coachEvidence'
import { pairRange, timeLabel, type TimeRange } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'
import type { useCoach } from '../hooks/useCoach'

const field = 'min-w-0 rounded-lg border border-line bg-canvas px-2.5 py-2 text-sm text-ink'
type Coach = ReturnType<typeof useCoach>

export function SourceLinks({ ids, sources }: { ids: string[]; sources: ResearchSource[] }) {
  return <span className="flex flex-wrap gap-x-3">
    {sources.filter(source => ids.includes(source.id)).map(source =>
      <a key={source.id} className="text-accent underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}
  </span>
}

function MeasurementCard({ item, tool }: { item: Observation; tool: string }) {
  return <details className="rounded-lg border border-line bg-canvas p-2.5">
    <summary className="cursor-pointer text-sm font-semibold">{tool} · {statuses[item.status]}</summary>
    <div className="mt-2 grid gap-3 text-xs text-muted sm:grid-cols-2">
      {([['原唱', item.reference], ['翻唱', item.user]] as const).map(([role, track]) => track && <div key={role}>
        <p className="font-semibold text-ink">{role} · {track.source === 'original' ? '原始音轨' : '分离人声'} · {track.pitchSource === 'harmonic' ? '快速基频' : track.pitchSource}</p>
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(track.metrics).map(([key, value]) => <li key={key}>{metricLabel(key, value)}</li>)}
        </ul>
        {track.warnings.map(warning => <p className="mt-1" key={warning}>{warning}</p>)}
      </div>)}
    </div>
    {Object.keys(item.comparison).length > 0 && <p className="mt-2 text-xs text-ink">翻唱减原唱 · {
      Object.entries(item.comparison).map(([key, value]) => metricLabel(key, value, true)).join(' · ')}</p>}
  </details>
}

export function DifficultyMap({ report, playback, view, coach, selected, onSelect, blocked }: {
  report: Report; playback: Playback; view: CoachView; coach: Coach;
  selected: Difficulty | undefined; onSelect: (id?: string) => void; blocked: boolean
}) {
  const session = view.session!
  const duration = report.preprocessing.referenceDuration
  const origin = report.preprocessing.referenceStart
  const tools = new Map(view.tools.map(tool => [tool.id, tool.label]))
  const [editing, setEditing] = useState<{ id?: string; title: string; tool: string; start: string; end: string } | null>(null)
  const affected = session.observations.filter(item => item.segmentId === selected?.id)
  const refRange: TimeRange | null = selected ? [selected.start, selected.end] : null
  const pair = refRange ? pairRange(report, 'reference', refRange) : null
  const canListenUser = !!pair?.user && !affected.some(item => item.status === 'alignment' || item.status === 'uncovered')
  function select(item: Difficulty) {
    onSelect(item.id)
    playback.selectRange(pairRange(report, 'reference', [item.start, item.end]), 'reference')
  }
  function begin(item?: Difficulty) {
    const start = item?.start ?? playback.range.reference?.[0] ?? Math.max(0, Math.min(duration - .1, playback.time))
    const end = item?.end ?? playback.range.reference?.[1] ?? Math.min(duration, start + 1)
    setEditing({ id: item?.id, title: item?.title ?? '', tool: item?.tool ?? view.tools[0].id,
      start: (start + origin).toFixed(3), end: (end + origin).toFixed(3) })
  }

  return <section aria-label="歌曲难点地图" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-base font-semibold">歌曲难点地图</h3>
      <Button disabled={blocked || session.difficulties.length >= 8} onClick={() => begin()}>添加难点</Button>
    </div>
    {session.difficulties.length === 0 ? <p className="text-sm text-muted">当前选段没有可定位的难点。</p> :
      <>
        <div className="rounded-lg border border-line bg-canvas px-3 py-2" aria-label="原唱难点时间轴">
          <div className="relative h-8">
            <div className="absolute inset-x-0 top-4 border-t border-line"/>
            {session.difficulties.map((item, index) =>
              <button type="button" aria-label={`定位 ${item.title} ${timeLabel(item.start + origin)}`}
                title={`${item.title} · ${timeLabel(item.start + origin)}`} key={item.id}
                onClick={() => select(item)}
                className={`absolute size-4 -translate-x-1/2 rounded-full border-2 ${selected?.id === item.id ? 'z-10 border-white bg-accent' : 'border-canvas bg-mint hover:bg-accent'}`}
                style={{ left: `${100 * (item.start + item.end) / 2 / duration}%`, top: index % 2 ? 15 : 4 }}/>)}
          </div>
          <div className="flex justify-between font-mono text-xs text-muted"><span>{timeLabel(origin)}</span><span>{timeLabel(origin + duration)}</span></div>
        </div>
        <ul className="flex flex-wrap gap-2">
          {session.difficulties.map(item => <li key={item.id}>
            <Button aria-pressed={selected?.id === item.id} onClick={() => select(item)}
              className={selected?.id === item.id ? 'border-accent text-accent' : ''}>
              {timeLabel(item.start + origin)} {item.title}
            </Button>
          </li>)}
        </ul>
      </>}
    {selected && refRange && <div className="space-y-2 rounded-xl border border-line bg-panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{selected.title}</p>
          <p className="text-xs text-muted">原唱 {timeLabel(selected.start + origin)}–{timeLabel(selected.end + origin)}
            {canListenUser && pair?.user && ` · 翻唱 ${timeLabel(pair.user[0] + report.preprocessing.userStart)}–${timeLabel(pair.user[1] + report.preprocessing.userStart)}`}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button onClick={() => playback.listenSelection('reference', refRange)}>复听原唱</Button>
          <Button disabled={!canListenUser} onClick={() => playback.listenSelection('user', refRange)}>复听翻唱</Button>
          <Button variant="text" disabled={blocked} onClick={() => begin(selected)}>编辑</Button>
          <Button variant="text" disabled={blocked} onClick={async () => {
            if (await coach.edit({ id: selected.id, remove: true })) { onSelect(); setEditing(null) }
          }}>删除</Button>
        </div>
      </div>
      <p className="text-sm text-muted">{selected.explanation}</p>
      <SourceLinks ids={selected.sourceIds} sources={session.sources}/>
      {view.stale ? <p className="text-sm text-muted">请按当前偏移重新测量双轨证据。</p> :
        affected.map(item => <MeasurementCard key={item.id} item={item} tool={tools.get(item.tool) ?? item.tool}/>)}
    </div>}
    {editing && <form className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault()
      if (await coach.edit({ id: editing.id, title: editing.title, tool: editing.tool, remove: false,
        start: Number(editing.start) - origin, end: Number(editing.end) - origin })) {
        if (editing.id) onSelect(editing.id)
        setEditing(null)
      }
    }}>
      <label className="grid gap-1 text-xs text-muted">难点标题<input className={field} required maxLength={100}
        value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })}/></label>
      <label className="grid gap-1 text-xs text-muted">专项工具<select className={field} value={editing.tool}
        onChange={event => setEditing({ ...editing, tool: event.target.value })}>
        {view.tools.map(tool => <option key={tool.id} value={tool.id}>{tool.label}</option>)}
      </select></label>
      <label className="grid gap-1 text-xs text-muted">原唱起点（秒）<input className={field} required type="number" min={origin}
        max={origin + duration} step="any" value={editing.start} onChange={event => setEditing({ ...editing, start: event.target.value })}/></label>
      <label className="grid gap-1 text-xs text-muted">原唱终点（秒）<input className={field} required type="number" min={origin}
        max={origin + duration} step="any" value={editing.end} onChange={event => setEditing({ ...editing, end: event.target.value })}/></label>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={blocked}>保存难点</Button>
        <Button variant="text" onClick={() => setEditing(null)}>取消</Button>
      </div>
    </form>}
  </section>
}

export function EvidenceList({ ids, observations }: { ids: string[]; observations: Observation[] }) {
  const values = citations(ids, observations)
  return values.length > 0 && <ul className="mt-2 flex flex-wrap gap-1 text-xs text-muted">
    {values.map((value, index) => <li key={index} className="rounded border border-line bg-canvas px-1.5 py-0.5">{value}</li>)}
  </ul>
}
