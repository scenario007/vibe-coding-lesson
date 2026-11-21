import { ArrowLeft, CircleAlert, LoaderCircle, ScanLine } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { PitchPreview, Report as AnalysisReport, Stage } from '../../apis/analysis/contracts'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { CoachPanel } from './components/CoachPanel'
import { AlignmentPanel } from './components/AlignmentPanel'
import { PitchChart } from './components/PitchChart'
import { PitchPreviewPanel } from './components/PitchPreviewPanel'
import { Spectrogram } from './components/Spectrogram'
import { ReportHeader } from './components/ReportHeader'
import { Segments } from './components/Segments'
import type { TimeRange } from './functions/timeline'
import { usePlayback } from './hooks/usePlayback'
import { useReport } from './hooks/useReport'

const stages: Record<Stage, string> = {
  queued: '等待本地分析', decode: '截取并准备音轨', separation_reference: '分离原唱人声与伴奏',
  separation_user: '分离我的演唱与伴奏', pitch_reference: '检测原唱基频', pitch_user: '检测我的演唱基频',
  alignment: '匹配两段演唱的时间', metrics: '计算音准与稳定性', report: '生成报告',
  completed: '分析完成', failed: '分析失败',
}

function AnalysisResult({ report, preview, adjust, adjusting, error }: {
  report: AnalysisReport; preview: PitchPreview; adjust: (offset: number | null, range?: TimeRange) => void; adjusting: boolean; error: string;
}) {
  const playback = usePlayback(report)
  return <div className="grid min-w-0 gap-5">
    <ReportHeader report={report}/>
    {report.warnings.length > 0 && <details className="rounded-xl border border-line bg-panel px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-muted"><CircleAlert size={14} className="mr-2 inline text-accent"/>录音与分析提示</summary>
      <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">{report.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    </details>}
    <div id="report-pitch" className="min-w-0 scroll-mt-16 overflow-hidden rounded-xl border-t-2 border-accent/65">
      <PitchChart report={report} playback={playback} preview={preview}/>
    </div>
    <section id="report-evidence" aria-labelledby="evidence-title"
      className="min-w-0 scroll-mt-16 rounded-2xl border border-mint/20 bg-[#14201f] p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-mint/12 text-mint"><ScanLine size={18}/></span>
        <h2 id="evidence-title" className="text-lg font-bold">声学观察与对齐</h2>
      </div>
      <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-3">
          <Spectrogram report={report} playback={playback} preview={preview}/>
          <details className="rounded-xl border border-line bg-panel px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold text-muted">pYIN 声学观察</summary>
            <Segments report={report} playback={playback}/>
          </details>
        </div>
        <AlignmentPanel key={JSON.stringify([report.alignment.method, report.alignment.offset, report.alignment.automatic?.referenceRange, report.alignment.automatic?.openingWindow])}
          report={report} playback={playback} adjusting={adjusting} adjust={adjust} error={error}/>
      </div>
    </section>
    <div id="report-coach" className="min-w-0 scroll-mt-16 overflow-hidden rounded-xl border-t-2 border-amber-200/65">
      <CoachPanel report={report} playback={playback} adjusting={adjusting}/>
    </div>
  </div>
}

export default function Report() {
  const { id = '' } = useParams()
  const { view, adjusting, error, adjust, refresh } = useReport(id)
  if (view.status === 'ready') return <AnalysisResult key={id} report={view.report} preview={view.preview} adjusting={adjusting}
    adjust={(offset, range) => void adjust(offset, range)} error={error}/>
  const failed = view.status === 'failed' || view.status === 'error'
  const detail = view.status === 'failed' ? view.job.error : view.status === 'error' ? view.message : null
  return <div className="mx-auto max-w-2xl">
    <Link to="/" className="mb-5 inline-flex items-center gap-2 rounded text-sm text-muted hover:text-ink"><ArrowLeft size={16}/> 返回分析工作台</Link>
    <Panel className="p-6 sm:p-8">
      <div className="flex items-start gap-4" role={failed ? 'alert' : 'status'} aria-live="polite">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#29233d] text-accent">
          {failed ? <CircleAlert size={23} className="text-danger"/> : <LoaderCircle size={23} className="animate-spin"/>}
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{failed ? '暂时无法完成分析' : '正在分析演唱'}</h1>
          {view.status === 'progress' && <p className="text-sm text-accent">{stages[view.job.stage]}</p>}
          {view.status === 'loading' && <p className="text-sm text-muted">正在读取任务状态。</p>}
          {view.status === 'progress' && <p className="text-sm leading-6 text-muted">
            已等待 {Math.max(0, Math.floor((Date.now()-Date.parse(view.job.createdAt))/1000))} 秒。
            {view.job.selection.reference.separate || view.job.selection.user.separate ?
              '含伴奏的音轨先分离人声。相同文件和选段可复用已有分离结果。' :
              '人声音轨就绪后，曲线会先显示在下方。'}
          </p>}
          {detail && <p className="text-sm leading-6 text-danger">{detail}</p>}
          {view.status === 'error' && <Button onClick={refresh}>重试读取</Button>}
          {view.status === 'failed' && <Link to="/" className="inline-block text-sm font-semibold text-accent underline">返回修改片段或分离选项</Link>}
        </div>
      </div>
    </Panel>
    {view.status === 'progress' && <PitchPreviewPanel key={id} job={view.job} preview={view.preview}/>}
  </div>
}
