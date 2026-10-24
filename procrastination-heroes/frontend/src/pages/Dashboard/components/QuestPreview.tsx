import { Emblem, Pill, Progress } from '@/components/ui'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import { categories, dateLabel } from '@/pages/objects/labels'
import { ArrowUpRight, CheckCircle2, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
export function QuestPreview({ detail }: { detail: QuestDetail }) {
  const { quest, steps, reward } = detail
  const done = steps.filter((s) => s.completedAt !== null).length
  return (
    <Link
      to={`/quests/${quest.id}`}
      className="group flex items-center gap-4 rounded-xl border border-[#e8eadf] bg-[#fdfef9] p-4 transition hover:border-[#b4c49e] hover:bg-[#f4f8ed]"
    >
      <Emblem size="small" symbol={reward.symbol} palette={reward.palette} />
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-medium text-[#465c3d]">{quest.title}</h3>
          <Pill>{categories[quest.category]}</Pill>
        </div>
        <div className="mb-2 max-w-sm">
          <Progress value={(done / steps.length) * 100} />
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[#9aa48d]">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            {done}/{steps.length} 步
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="size-3" />
            {dateLabel(quest.dueDate)}
          </span>
        </div>
      </div>
      <ArrowUpRight className="size-4 text-[#9cae8b] transition group-hover:translate-x-0.5" />
    </Link>
  )
}
