import { Card, Pill } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import { CheckCheck, Coins, Flame, Timer } from 'lucide-react'
export function DailyOverview({ data }: { data: DashboardResponse }) {
  return (
    <div className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        {
          label: '今天完成',
          value: data.todaySteps,
          unit: '个小步骤',
          Icon: CheckCheck,
          tone: 'sage',
        },
        {
          label: '今日专注',
          value: Math.floor(data.focusSeconds / 60),
          unit: '分钟',
          Icon: Timer,
          tone: 'sky',
        },
        {
          label: '累积成长',
          value: data.progress.experience,
          unit: '经验值',
          Icon: Flame,
          tone: 'rose',
        },
        {
          label: '我的积蓄',
          value: data.progress.coins,
          unit: '冒险币',
          Icon: Coins,
          tone: 'gold',
        },
      ].map(({ label, value, unit, Icon, tone }) => (
        <Card key={label} className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[#716449]">{label}</p>
            <Pill tone={tone}>
              <Icon className="size-3.5" />
            </Pill>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-serif text-3xl font-bold text-[#665d3e]">{value}</span>
            <span className="pb-1 text-[10px] text-[#8a785d]">{unit}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
