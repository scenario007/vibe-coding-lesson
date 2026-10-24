import { Card, Emblem, Progress } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
export function HeroProfile({ data, level }: { data: DashboardResponse; level: number }) {
  return (
    <Card className="bg-[#f0f4e7]">
      <p className="text-[9px] tracking-[.18em] text-[#94a17f]">YOUR HERO CARD</p>
      <div className="my-5 flex justify-center">
        <Emblem symbol={data.user.avatar} palette="sage" />
      </div>
      <h3 className="text-center font-serif text-lg font-bold text-[#526b43]">
        Lv.{level} · {data.user.nickname}
      </h3>
      <p className="mt-2 text-center text-[10px] text-[#97a687]">
        已经完成 {data.completedCount} 场自己的小冒险
      </p>
      <div className="mt-5">
        <Progress value={data.progress.experience % 100} />
        <p className="mt-2 text-right text-[9px] text-[#9aa887]">
          距离下一级还有 {100 - (data.progress.experience % 100)} XP
        </p>
      </div>
      <Link
        to="/base"
        className="mt-5 flex items-center justify-between rounded-xl bg-white/60 px-3 py-3 text-xs text-[#758d5f]"
      >
        回我的小屋看看
        <ArrowRight className="size-3.5" />
      </Link>
    </Card>
  )
}
