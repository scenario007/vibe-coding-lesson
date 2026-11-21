import { useState } from 'react'
import { ListMusic, MessageCircle, Sparkles } from 'lucide-react'
import type { Report } from '../../../apis/analysis/contracts'
import type { Feedback, Observation, SongInfo } from '../../../apis/coach/contracts'
import { Button } from '../../../components/ui/Button'
import { timeLabel } from '../functions/timeline'
import { statuses } from '../functions/coachEvidence'
import { useCoach } from '../hooks/useCoach'
import type { Playback } from '../hooks/usePlayback'
import { CoachSettings } from '../../../components/CoachSettings'
import { DifficultyMap, EvidenceList, SourceLinks } from './DifficultyMap'

const field = 'min-w-0 rounded-lg border border-line bg-canvas px-2.5 py-2 text-sm text-ink'

function songSuggestion(report: Report): SongInfo {
  try {
    const track: unknown = JSON.parse(sessionStorage.getItem(`vocallab-lyrics:${report.referenceMetadata.id}`) ?? 'null')?.track
    if (typeof track === 'object' && track !== null && 'trackName' in track && typeof track.trackName === 'string') {
      return { title: track.trackName, artist: 'artistName' in track && typeof track.artistName === 'string' ? track.artistName : '',
        version: '', notes: '' }
    }
  } catch { /* Song details can be entered directly. */ }
  return { title: '', artist: '', version: '', notes: '' }
}

function FeedbackCard({ item, observations, title, locate }: {
  item: Feedback; observations: Observation[]; title: string; locate: () => void
}) {
  return <article className="rounded-lg border border-line bg-panel p-3 text-sm">
    <button type="button" className="font-semibold text-accent underline" onClick={locate}>{title}</button>
    <p className="mt-2"><strong>观察</strong> {item.observation}</p>
    <EvidenceList ids={item.evidenceIds} observations={observations}/>
    <p className="mt-2 text-muted"><strong>可能的解释</strong> {item.interpretation}</p>
    <p className="mt-2"><strong>练习目标</strong> {item.practice.goal}</p>
    <ol className="list-decimal space-y-1 pl-5 text-muted">{item.practice.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
    <p className="mt-1 text-muted">难度 · {item.practice.difficulty}</p>
    <p className="mt-1 text-muted">复录验证 · {item.practice.verification}</p>
  </article>
}

export function CoachPanel({ report, playback, adjusting }: { report: Report; playback: Playback; adjusting: boolean }) {
  const coach = useCoach(report)
  const { view, operation } = coach
  const session = view?.session
  const [draft, setDraft] = useState<SongInfo | null>(null)
  const [suggestion, setSuggestion] = useState(() => songSuggestion(report))
  const song = draft ?? session?.song ?? suggestion
  const [toolsDraft, setTools] = useState<string[] | null>(null)
  const extra = toolsDraft ?? session?.requestedTools ?? []
  const [thresholdDraft, setThreshold] = useState<string | null>(null)
  const threshold = thresholdDraft ?? session?.highThreshold?.toString() ?? ''
  const [selectedId, setSelected] = useState<string>()
  const [question, setQuestion] = useState('')
  const [scope, setScope] = useState<'report' | 'difficulty' | 'selection'>('difficulty')
  const selected = session?.difficulties.find(item => item.id === selectedId)
  const blocked = adjusting || operation !== null
  const range = playback.range.reference
  const scopeRange = scope === 'selection' ? range : null
  const origin = report.preprocessing.referenceStart
  const definitions = new Map(view?.tools.map(tool => [tool.id, tool]))
  const locate = (id: string) => {
    const item = session?.difficulties.find(entry => entry.id === id)
    if (item) {
      setSelected(id)
      playback.selectRange({ reference: [item.start, item.end], user: null }, 'reference')
    }
  }

  return <section aria-labelledby="coach-title" className="space-y-5 rounded-xl border border-amber-200/15 bg-[#211e1b] p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 id="coach-title" className="flex items-center gap-2.5 text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-lg bg-amber-200/12 text-amber-200"><Sparkles size={18}/></span> 声乐教练
        </h2>
        <p className="mt-1 text-sm text-muted">从当前选段定位演唱难点，复听并比较实测表现。</p>
      </div>
      {view && <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted">{view.aiAvailable ? view.model : '本地模式'} · {{
          deepseek: 'DeepSeek 联网已配置', brave: 'Brave 研究已配置', none: 'AI 联网未配置',
        }[view.searchProvider]}</p>
        <CoachSettings variant="text" onChanged={coach.retry}/>
      </div>}
    </header>
    {coach.loading && <p role="status" className="text-sm text-muted">正在读取教练分析…</p>}
    {coach.error && <p role="alert" className="text-sm text-danger">{coach.error}</p>}
    {!view && !coach.loading && <Button onClick={coach.retry}>重试读取</Button>}
    {view && <>
      <details className="rounded-lg border border-line px-3 py-2 text-sm">
        <summary className="cursor-pointer">本报告 AI 估算费用 {view.usage.estimatedYuan === null ?
          (view.usage.textCalls || view.usage.unpricedSearches ? '待估算' : '暂无记录') : `¥${view.usage.estimatedYuan.toFixed(4)}`}</summary>
        <p className="mt-1 text-xs text-muted">已记录 {view.usage.textCalls} 次文本调用 · 输入 {view.usage.inputTokens} · 输出 {view.usage.outputTokens} tokens
          {view.usage.cachedTokens > 0 && ` · 缓存命中 ${view.usage.cachedTokens}`}。</p>
        <p className="mt-1 text-xs text-muted">按服务商公开单价估算，实际扣费以服务商账单为准。旧调用可能没有计量记录。
          {view.usage.unpricedTextCalls > 0 && ` 有 ${view.usage.unpricedTextCalls} 次文本调用无可用价格或用量。`}
          {view.usage.unpricedSearches > 0 && ` 有 ${view.usage.unpricedSearches} 次 Brave 搜索未计入金额。`}</p>
      </details>
      <form className="space-y-3 rounded-xl border border-line bg-panel p-3 sm:p-4" onSubmit={event => {
        event.preventDefault()
        void coach.analyze(song, true, extra, threshold === '' ? null : Number(threshold), false)
      }}>
        <div className="grid gap-2 sm:grid-cols-3">
          {([['title', '歌名', 160], ['artist', '原唱歌手', 120], ['version', '录音版本', 120]] as const).map(([key, label, limit]) =>
            <label key={key} className="grid gap-1 text-xs text-muted">{label}
              <input className={field} value={song[key]} maxLength={limit} onChange={event => setDraft({ ...song, [key]: event.target.value })}/>
            </label>)}
        </div>
        <details>
          <summary className="cursor-pointer text-sm text-muted">补充说明与专项工具</summary>
          <div className="mt-2 grid gap-2">
            <label className="grid gap-1 text-xs text-muted">补充说明
              <textarea className={field} rows={2} maxLength={600} value={song.notes} onChange={event => setDraft({ ...song, notes: event.target.value })}/>
            </label>
            <label className="flex flex-wrap items-center gap-2 text-xs text-muted">高音下限（MIDI 音高，可选）
              <input type="number" className={field} min={36} max={84} step={0.5} value={threshold}
                onChange={event => setThreshold(event.target.value)}/>
            </label>
            <p className="text-xs text-muted">可额外选择最多两项。未指定高音下限时使用歌曲的相对音域。</p>
            <div className="flex flex-wrap gap-2">
              {view.tools.map(tool => <label className="flex items-center gap-1 rounded border border-line px-2 py-1 text-xs"
                title={tool.description} key={tool.id}>
                <input type="checkbox" disabled={!extra.includes(tool.id) && extra.length >= 2} checked={extra.includes(tool.id)}
                  onChange={event => setTools(event.target.checked ? [...extra, tool.id] : extra.filter(id => id !== tool.id))}/>
                {tool.label}
              </label>)}
            </div>
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={blocked} onClick={() => void coach.analyze(song, false, extra, threshold === '' ? null : Number(threshold), false)}>
            <ListMusic size={16}/> 本地专项分析
          </Button>
          <Button variant="primary" type="submit" disabled={blocked || !view.aiAvailable || !song.title.trim()}>
            <Sparkles size={16}/> 生成 AI 深度分析
          </Button>
          <Button variant="text" disabled={blocked} onClick={() => {
            const lyrics = songSuggestion(report)
            setSuggestion(lyrics)
            if (lyrics.title) setDraft({ ...song, title: lyrics.title, artist: lyrics.artist })
          }}>采用已选歌词歌名</Button>
          {session?.mode === 'ai' && view.aiAvailable && <Button variant="text" disabled={blocked || !song.title.trim()}
            onClick={() => void coach.analyze(song, true, extra, threshold === '' ? null : Number(threshold), true)}>重新生成 AI 分析</Button>}
        </div>
        {view.aiAvailable && <p className="text-xs text-muted">主动生成或提问会发送歌曲信息、问题和必要的声学摘要。音频及视频保存在本机。</p>}
      </form>
      {operation && <p role="status" className="text-sm text-accent">{{
        local: '正在测量本地声学特征…', deep: '正在研究歌曲、选择专项工具并生成报告…',
        edit: '正在保存难点并更新证据…', recheck: '正在更新双轨证据…', ask: '教练正在核对证据…',
      }[operation]}</p>}
      {session && <>
        {view.stale && <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/60 p-2">
          <p className="text-sm text-muted">偏移已改变，旧比较和 AI 结论已过期。</p>
          <Button disabled={blocked} onClick={() => void coach.recheck(session.song)}>更新声学证据</Button>
        </div>}
        {session.warnings.length > 0 && <ul className="space-y-1 text-xs text-muted">
          {session.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
        </ul>}
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer font-semibold">{session.mode === 'ai' ? '歌曲研究与分析计划' : '本地分析计划'}</summary>
          <p className="mt-2 text-sm text-muted">{session.plan.summary}</p>
          <ul className="mt-2 space-y-2 text-sm">
            {session.plan.hypotheses.map((hypothesis, index) => <li key={index}>
              {hypothesis.description}{hypothesis.locationHint && ` · 位置线索：${hypothesis.locationHint}`}
              <SourceLinks ids={hypothesis.sourceIds} sources={session.sources}/>
            </li>)}
          </ul>
          {session.plan.limitations.map((line, i) => <p className="mt-1 text-xs text-muted" key={i}>{line}</p>)}
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {session.plan.tools.map(tool => <li key={tool.tool}>{definitions.get(tool.tool)?.label ?? tool.tool} · {tool.reason}</li>)}
          </ul>
          {session.runs.length > 0 && <details className="mt-2 text-xs text-muted">
            <summary className="cursor-pointer">查看工具执行记录</summary>
            <ul className="mt-1 flex flex-wrap gap-2">{session.runs.map((run, i) => <li className="rounded border border-line px-1.5 py-0.5" key={i}>
              {definitions.get(run.tool)?.label ?? run.tool} · {statuses[run.status]} · {run.milliseconds.toFixed(1)} ms
            </li>)}</ul>
          </details>}
          {session.sources.length > 0 && <details className="mt-2 text-xs text-muted">
            <summary className="cursor-pointer">联网检索来源</summary>
            <ul className="mt-2 space-y-2">{session.sources.map(source => <li key={source.id}>
              <SourceLinks ids={[source.id]} sources={session.sources}/><p>{source.summary}</p>
            </li>)}</ul>
          </details>}
        </details>
        <DifficultyMap report={report} playback={playback} view={view} coach={coach}
          selected={selected} onSelect={setSelected} blocked={blocked}/>
        {session.report && !view.stale && <section aria-label="AI 声乐分析报告" className="space-y-3 rounded-xl border border-amber-200/25 bg-[#26221b] p-3 sm:p-4">
          <h3 className="font-semibold">AI 声乐分析报告</h3>
          <p className="text-sm text-muted">{session.report.summary}</p>
          {([['演唱优势', session.report.strengths], ['优先练习', session.report.priorities]] as const).map(([label, items]) =>
            items.length > 0 && <div className="grid gap-2" key={label}>
              <h4 className="text-sm font-semibold">{label}</h4>
              {items.map((item, i) => <FeedbackCard key={i} item={item} observations={session.observations}
                title={session.difficulties.find(d => d.id === item.segmentId)?.title ?? '查看难点'} locate={() => locate(item.segmentId)}/>)}
            </div>)}
          {session.report.limitations.map((line, i) => <p className="text-xs text-muted" key={i}>{line}</p>)}
        </section>}
        {view.aiAvailable && !view.stale && <section aria-label="片段问答" className="space-y-3 rounded-xl border border-accent/25 bg-[#242031] p-3 sm:p-4">
          <h3 className="flex items-center gap-2 font-semibold"><MessageCircle size={16} className="text-accent"/> 教练问答</h3>
          {session.history.length > 0 && <ol className="max-h-96 space-y-2 overflow-y-auto" aria-label="问答记录">
            {session.history.map((turn, index) => <li key={index} className="rounded-lg border border-line bg-canvas p-3 text-sm">
              <p className="font-semibold">{turn.question}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">{turn.answer.answer}</p>
              <EvidenceList ids={turn.answer.evidenceIds} observations={turn.observations}/>
              {turn.runs.length > 0 && <p className="mt-1 text-xs text-muted">补充测量 · {turn.runs.map(run =>
                `${definitions.get(run.tool)?.label ?? run.tool}（${statuses[run.status]}）`).join('、')}</p>}
              {turn.range && <Button variant="text" onClick={() => {
                if (turn.segmentId) locate(turn.segmentId)
                else if (turn.range) playback.selectRange({ reference: turn.range, user: null }, 'reference')
              }}>定位 {timeLabel(turn.range[0] + origin)}</Button>}
            </li>)}
          </ol>}
          <form className="space-y-2" onSubmit={async event => {
            event.preventDefault()
            if (await coach.ask({ question, segmentId: scope === 'difficulty' ? selected?.id : undefined,
              start: scopeRange?.[0], end: scopeRange?.[1] })) setQuestion('')
          }}>
            <label className="flex flex-wrap items-center gap-2 text-xs text-muted">提问范围
              <select className={field} value={scope === 'difficulty' && !selected ? 'report' : scope}
                onChange={event => setScope(event.target.value as typeof scope)}>
                <option value="report">整个报告</option>
                <option value="difficulty" disabled={!selected}>{selected?.title ?? '当前难点'}</option>
                <option value="selection" disabled={!range}>曲线复听选区</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted">你的问题
              <textarea className={field} rows={2} maxLength={1200} placeholder="例如，这段长音的波动有周期性吗？"
                value={question} onChange={event => setQuestion(event.target.value)}/>
            </label>
            <Button type="submit" variant="primary" disabled={blocked || !question.trim() || (scope === 'selection' && !range)}>发送问题</Button>
          </form>
        </section>}
      </>}
    </>}
  </section>
}
