import { Card, Pill } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import { CircleCheck, Sparkles } from 'lucide-react'
export function DailyChallenges({ data }: { data: DashboardResponse }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-4 text-[#ba9b57]" />
        <h2 className="text-sm font-semibold">每日小挑战</h2>
        <Pill tone="gold">轻轻松松，也算数</Pill>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            label: '今天先完成一个步骤',
            done: data.todaySteps > 0,
            description: '给大目标一个小小的开头',
          },
          {
            label: '留一点专注时间给自己',
            done: data.focusSeconds >= 600,
            description: '累计专注 10 分钟',
          },
        ].map((c) => (
          <div key={c.label} className="flex gap-3 rounded-xl bg-[#f6f8ee] p-4">
            <CircleCheck
              className={`mt-0.5 size-5 ${c.done ? 'text-[#7da165]' : 'text-[#ccd5bf]'}`}
            />
            <div>
              <p className="text-xs font-medium text-[#728564]">{c.label}</p>
              <p className="mt-2 text-[10px] text-[#a2ac94]">
                {c.done ? '今日印章已点亮' : c.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
