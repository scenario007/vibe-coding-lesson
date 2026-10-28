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
      className="group flex items-center gap-4 rounded-xl border border-[#eadcc1] bg-[#fff8e7] p-4 transition hover:border-[#8a785d] hover:bg-[#fff8e7]"
    >
      <Emblem
        size="small"
        symbol={reward.symbol}
        palette={reward.palette}
        imageUrl={reward.imageUrl}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-medium text-[#665d3e]">{quest.title}</h3>
          <Pill>{categories[quest.category]}</Pill>
        </div>
        <div className="mb-2 max-w-sm">
          <Progress value={(done / steps.length) * 100} />
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[#716449]">
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
      <ArrowUpRight className="size-4 text-[#8a785d] transition group-hover:translate-x-0.5" />
    </Link>
  )
}
