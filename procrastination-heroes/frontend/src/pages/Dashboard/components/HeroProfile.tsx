import { Card, Emblem } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
export function HeroProfile({ data }: { data: DashboardResponse }) {
  return (
    <Card className="bg-[#eadcc1]">
      <p className="text-[9px] tracking-[.18em] text-[#716449]">YOUR HERO CARD</p>
      <div className="my-5 flex justify-center">
        <Emblem symbol={data.user.avatar} palette="sage" />
      </div>
      <h3 className="text-center font-serif text-lg font-bold text-[#665d3e]">
        {data.user.nickname}
      </h3>
      <p className="mt-2 text-center text-[10px] text-[#716449]">
        已经完成 {data.completedCount} 场自己的小冒险
      </p>
      <Link
        to="/growth"
        className="mt-5 flex items-center justify-between rounded-xl bg-white/60 px-3 py-3 text-xs text-[#716449]"
      >
        看看我的奖品展板
        <ArrowRight className="size-3.5" />
      </Link>
    </Card>
  )
}
