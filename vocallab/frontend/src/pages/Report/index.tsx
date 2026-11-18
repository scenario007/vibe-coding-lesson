import { ArrowLeft, ArrowUpRight, CircleAlert, LoaderCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { PitchPreview, Report as AnalysisReport, Stage } from '../../apis/analysis/contracts'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { AlignmentPanel } from './components/AlignmentPanel'
import { ListenPanel } from './components/ListenPanel'
import { Overview } from './components/Overview'
import { PitchChart } from './components/PitchChart'
import { PitchPreviewPanel } from './components/PitchPreviewPanel'
import { ReportLyrics } from './components/ReportLyrics'
import { Spectrogram } from './components/Spectrogram'
import { Segments } from './components/Segments'
import { WaveformComparison } from './components/WaveformComparison'
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
  return <div className="grid gap-4">
    <header className="mb-1 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-4xl font-bold tracking-[-0.05em]">演唱分析报告</h1>
        <p className="mt-2 truncate text-sm text-muted" title={report.referenceMetadata.name+' / '+report.userMetadata.name}>
          <span className="text-accent">{report.referenceMetadata.name}</span> <span className="mx-1">/</span> <span className="text-mint">{report.userMetadata.name}</span>
        </p>
      </div>
      <Link to="/" className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3.5 py-2.5 text-sm font-semibold hover:bg-raised">编辑分析 <ArrowUpRight size={15}/></Link>
    </header>
    <Overview report={report}/>
    <WaveformComparison report={report} playback={playback}/>
    <PitchChart report={report} playback={playback} preview={preview}/>
    <ListenPanel report={report} playback={playback}/>
    <Spectrogram report={report} playback={playback} preview={preview}/>
    <ReportLyrics report={report} playback={playback}/>
    <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
      <Segments report={report} playback={playback}/>
      <AlignmentPanel key={JSON.stringify([report.alignment.method, report.alignment.offset, report.alignment.automatic?.referenceRange])}
        report={report} playback={playback} adjusting={adjusting} adjust={adjust} error={error}/>
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
