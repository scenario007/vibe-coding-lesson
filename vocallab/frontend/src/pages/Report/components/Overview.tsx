import { ArrowUpRight, CircleAlert } from 'lucide-react'
import type { Report } from '../../../apis/analysis/contracts'
import { Button } from '../../../components/ui/Button'
import { Panel } from '../../../components/ui/Panel'
import { noteLabel, timeLabel } from '../functions/timeline'
import type { Playback } from '../hooks/usePlayback'

const signed = (value: number) => value > 0 ? `+${value}` : String(value)

export function Overview({ report, playback, scorePitch, scoring, disabled, error }: {
  report: Report; playback: Playback; scorePitch: () => void; scoring: boolean; disabled: boolean; error: string
}) {
  const pitch = report.pitchScore
  const start = report.preprocessing.referenceStart
  function locate(time: number) {
    playback.position('reference', Math.max(0, time - start))
    document.getElementById('pitch-heading')?.scrollIntoView({ block: 'start' })
  }
  return <>
    <Panel className="p-4 sm:p-6" aria-labelledby="score-heading">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-2">
        <div>
          <h2 id="score-heading" className="text-sm font-semibold">音准分</h2>
          <p className="mt-2 font-mono text-4xl font-semibold tracking-tight text-ink" aria-label="音准分结果">{pitch?.score ?? '待评'}
            {pitch?.score != null && <span className="ml-1 text-base text-muted">/ 100</span>}</p>
          <p className="mt-2 text-xs text-muted">快速基频 · 原调
            {pitch && ` · 原唱 ${timeLabel(pitch.start)}–${timeLabel(pitch.end)}`}</p>
        </div>
        {pitch ? <div className="space-y-1 text-sm text-muted" aria-live="polite">
          <p>可判定音符 <strong className="font-mono text-ink">{pitch.scoredNotes + pitch.missedNotes} / {pitch.totalNotes}</strong>
            {pitch.totalNotes > 0 && `（${Math.round(pitch.coverage * 100)}%）`}</p>
          <p className="text-xs">可评 {pitch.scoredNotes} · 翻唱静音 {pitch.missedNotes} · 待评片段 {pitch.pendingPhrases}</p>
        </div> : <Button disabled={disabled || scoring} onClick={scorePitch}>{scoring ? '正在计算…' : '计算快速基频音准分'}</Button>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {pitch?.status === 'alignment' &&
        <p className="mt-4 text-sm text-muted">请先用时间对齐确认两轨对应位置，随后会自动更新评分。</p>}
      {pitch?.status === 'insufficient' &&
        <p className="mt-4 text-sm text-muted">整段证据不足。可评片段和待复核位置列在下方。</p>}
      {!!pitch?.phrases.length && <ul aria-label="逐段音准" className="mt-4 grid max-h-80 gap-2 overflow-auto pr-1">
        {pitch.phrases.map(phrase => <li key={phrase.start}>
          <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-left text-sm hover:border-accent/70"
            onClick={() => locate(phrase.start)}>
            <span className="min-w-0">
              <span className="block font-mono text-xs text-muted">{timeLabel(phrase.start)}–{timeLabel(phrase.end)}</span>
              <span className="mt-1 block text-xs text-muted">
                可评 {phrase.scoredNotes}/{phrase.totalNotes} 音
                {phrase.missedNotes > 0 && ` · 静音 ${phrase.missedNotes} 音`}
                {phrase.deviationCents != null && Math.abs(phrase.deviationCents) >= 50 &&
                  ` · 已测音${phrase.deviationCents > 0 ? '偏高' : '偏低'} ${Math.abs(phrase.deviationCents)} 音分`}
                {phrase.driftCents != null && ` · 长音漂移 ${signed(phrase.driftCents)} 音分`}
                {phrase.octaveUncertainFrames > 0 && ` · 八度存疑 ${phrase.octaveUncertainFrames} 帧`}
                {phrase.timingMilliseconds != null && ` · 局部时差候选 ${signed(phrase.timingMilliseconds)} ms`}
              </span>
            </span>
            <span className="flex items-center gap-2 text-xs">
              {phrase.status === 'alignment' ? '对齐待确认' : phrase.status === 'insufficient' ? '证据不足' :
                phrase.status === 'missed' ? '翻唱静音 · 0 分' : `${phrase.score} 分`}
              <ArrowUpRight size={14} className="text-accent"/>
            </span>
          </button>
          {phrase.notes.length > 0 && <details className="mx-2 mt-1 rounded-lg border border-line/70 px-2 py-1.5">
            <summary className="cursor-pointer text-xs text-muted">音符明细</summary>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {phrase.notes.map(note => <li key={note.start}>
                <button type="button" onClick={() => locate(note.start)}
                  className="flex w-full flex-wrap justify-between gap-1 rounded px-2 py-1 text-left text-xs hover:bg-raised">
                  <span className="font-mono">{timeLabel(note.start)} · {noteLabel(note.referenceMidi)}</span>
                  <span className="text-muted">{note.status === 'scored' ?
                    `${note.score} 分${note.deviationCents == null ? '' : ` · ${signed(note.deviationCents)} 音分`}` :
                    note.status === 'missed' ? '翻唱静音' : note.status === 'alignment' ? '对齐待确认' : '证据不足'}</span>
                </button>
              </li>)}
            </ul>
          </details>}
        </li>)}
      </ul>}
    </Panel>
    {report.warnings.length > 0 && <details className="rounded-xl border border-line bg-panel px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-muted"><CircleAlert size={14} className="mr-2 inline text-accent"/>录音与分析提示</summary>
      <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">{report.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    </details>}
  </>
}
