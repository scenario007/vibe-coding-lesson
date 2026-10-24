import { Card, Emblem } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import { Link } from 'react-router-dom'
export function RecentMemories({ data }: { data: DashboardResponse }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold">最近的纪念物</h2>
        <Link to="/growth" className="text-[10px] text-[#99a88a]">
          查看图鉴 →
        </Link>
      </div>
      {data.rewards.length ? (
        <div className="flex gap-3">
          {data.rewards.slice(0, 3).map((r) => (
            <Link to="/growth" key={r.id} className="min-w-0 flex-1 text-center">
              <div className="flex justify-center">
                <Emblem symbol={r.design.symbol} palette={r.design.palette} size="small" />
              </div>
              <p className="mt-2 truncate text-[9px] text-[#8d9d7a]">{r.design.name}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-3 text-center text-[11px] leading-6 text-[#a1ad92]">
          完成一项任务，
          <br />
          就能点亮属于它的专属纪念物。
        </p>
      )}
    </Card>
  )
}
