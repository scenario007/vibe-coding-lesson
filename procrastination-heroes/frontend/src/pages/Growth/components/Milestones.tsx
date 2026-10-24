import { Card, Emblem } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import type { RewardEvent } from '@/objects/economy/RewardEvent'
import { Sparkles } from 'lucide-react'
export function Milestones({ data, events }: { data: DashboardResponse; events: RewardEvent[] }) {
  return (
    <Card className="bg-[#eff4e5]">
      <Sparkles className="mb-4 size-6 text-[#9bb67e]" />
      <h2 className="font-serif text-xl font-bold text-[#6f8c54]">你的小小里程碑</h2>
      <div className="mt-5 space-y-3">
        {[
          { label: '勇敢开场', description: '创建第一项任务', done: data.quests.length > 0 },
          { label: '这一小步，算数', description: '完成第一个步骤', done: events.length > 0 },
          { label: '第一次通关', description: '完成一场冒险', done: data.completedCount > 0 },
        ].map((m) => (
          <div
            key={m.label}
            className={`flex items-center gap-3 rounded-xl p-3 ${m.done ? 'bg-white/80' : 'bg-white/30 opacity-50'}`}
          >
            <Emblem symbol="star" palette={m.done ? 'gold' : 'sage'} size="small" />
            <div>
              <p className="text-xs font-medium text-[#8a9d70]">{m.label}</p>
              <p className="mt-1 text-[9px] text-[#a9b595]">
                {m.description} · {m.done ? '已达成' : '等待点亮'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
