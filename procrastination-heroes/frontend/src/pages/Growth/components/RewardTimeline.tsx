import { Card } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import type { RewardEvent } from '@/objects/economy/RewardEvent'
import { Coins, Sparkles } from 'lucide-react'
export function RewardTimeline({
  data,
  events,
}: {
  data: DashboardResponse
  events: RewardEvent[]
}) {
  return (
    <Card>
      <h2 className="mb-5 text-sm font-semibold">最近的成长记录</h2>
      {events.length ? (
        <div className="space-y-3">
          {events.slice(0, 20).map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center gap-3 border-b border-[#eadcc1] pb-3"
            >
              <span className="grid size-8 place-items-center rounded-full bg-[#eadcc1] text-[#8a785d]">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-[#716449]">
                  {data.quests.find((q) => q.quest.id === e.questId)?.quest.title || '冒险任务'}
                </p>
                <p className="mt-1 text-[9px] text-[#8a785d]">
                  {new Date(e.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <span className="text-xs text-[#716449]">+{e.experience} XP</span>
              <span className="flex items-center gap-1 text-xs text-[#716449]">
                <Coins className="size-3" />+{e.coins}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-5 text-center text-xs text-[#8a785d]">
          第一次进展，会从你确认完成一个步骤开始。
        </p>
      )}
    </Card>
  )
}
