import { Activity, ArrowUpRight, AudioLines, Mic, ScanLine, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Report } from '../../../apis/analysis/contracts'
import { timeLabel } from '../functions/timeline'

const links = [
  { id: 'report-pitch', label: '音高与复听', icon: Activity, color: 'text-accent' },
  { id: 'report-evidence', label: '声学证据', icon: ScanLine, color: 'text-mint' },
  { id: 'report-coach', label: 'AI 声乐教练', icon: Sparkles, color: 'text-amber-200' },
]

export function ReportHeader({ report }: { report: Report }) {
  const { referenceStart, referenceDuration, userStart, userDuration } = report.preprocessing
  const tracks = [
    { role: '原唱', name: report.referenceMetadata.name, start: referenceStart, duration: referenceDuration,
      icon: AudioLines, color: 'text-accent', tile: 'bg-accent/12' },
    { role: '翻唱', name: report.userMetadata.name, start: userStart, duration: userDuration,
      icon: Mic, color: 'text-mint', tile: 'bg-mint/12' },
  ]
  return <>
    <header className="overflow-hidden rounded-2xl border border-line bg-linear-to-br from-[#27213c] via-panel to-[#16272a] p-4 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-[-0.05em] sm:text-4xl">演唱分析报告</h1>
        <Link to="/" className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas/70 px-3 py-2 text-sm font-semibold hover:bg-raised">
          编辑分析 <ArrowUpRight size={15}/>
        </Link>
      </div>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {tracks.map(({ role, name, start, duration, icon: Icon, color, tile }) =>
          <div key={role} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/8 bg-canvas/55 px-3 py-2.5">
            <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tile} ${color}`}><Icon size={17}/></span>
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${color}`}>{role}</p>
              <p className="truncate text-sm font-medium" title={name}>{name}</p>
            </div>
            <p className="ml-auto shrink-0 text-right font-mono text-[10px] tabular-nums text-muted sm:text-xs">
              {timeLabel(start)}<br/>{timeLabel(start + duration)}
            </p>
          </div>)}
      </div>
    </header>
    <nav aria-label="报告导航" className="sticky top-0 z-30 grid grid-cols-3 gap-1 rounded-xl border border-line bg-canvas/95 p-1.5 shadow-sm backdrop-blur">
      {links.map(({ id, label, icon: Icon, color }) =>
        <a key={id} href={`#${id}`} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-1 text-center text-xs font-semibold hover:bg-raised sm:text-sm ${color}`}>
          <Icon size={16} className="hidden shrink-0 sm:block"/> {label}
        </a>)}
    </nav>
  </>
}
