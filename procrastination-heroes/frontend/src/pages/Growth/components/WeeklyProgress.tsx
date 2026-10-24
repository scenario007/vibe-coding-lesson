import { Card, Pill } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
export function WeeklyProgress({ data, max }: { data: DashboardResponse; max: number }) {
  return (
    <Card>
      <div className="mb-6 flex justify-between">
        <h2 className="text-sm font-semibold">最近七天，我在慢慢前进</h2>
        <Pill>完成步骤</Pill>
      </div>
      <div className="flex h-44 items-end justify-between gap-3 px-1">
        {data.week.map((d) => (
          <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-2 text-[10px] text-[#a6b18f]">{d.steps}</span>
            <div
              className={`w-full max-w-10 rounded-t-lg ${d.steps ? 'bg-[#a0ba87]' : 'bg-[#edf0e5]'}`}
              style={{ height: Math.max(3, (d.steps / max) * 120) + 'px' }}
            />
            <span className="mt-3 text-[9px] text-[#a5b092]">
              {d.date.slice(5).replace('-', '/')}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-[10px] text-[#adb69d]">
        这是完成记录，不是排名。按自己的节奏推进就好。
      </p>
    </Card>
  )
}
