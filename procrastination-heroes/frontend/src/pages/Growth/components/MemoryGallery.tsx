import { Button, Card, Emblem, EmptyState } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import { ArrowRight, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
export function MemoryGallery({ data }: { data: DashboardResponse }) {
  return (
    <Card className="mb-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="size-4 text-[#716449]" />
          我的战利品档案
        </h2>
        <span className="text-[10px] text-[#8a785d]">每件藏品，都有一个完成过的故事</span>
      </div>
      {data.rewards.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.rewards.map((reward) => (
            <div key={reward.id} className="rounded-xl border border-[#cabb9e] bg-[#fff8e7] p-5">
              <div className="mb-4 flex justify-center">
                <Emblem
                  symbol={reward.design.symbol}
                  palette={reward.design.palette}
                  imageUrl={reward.design.imageUrl}
                />
              </div>
              <h3 className="text-center text-sm font-semibold text-[#716449]">
                {reward.design.name}
              </h3>
              <p className="mt-3 text-center text-[11px] leading-6 text-[#716449]">
                {reward.design.story}
              </p>
              <p className="my-3 text-center text-[9px] text-[#8a785d]">
                {new Date(reward.unlockedAt).toLocaleDateString('zh-CN')} 解锁 ·{' '}
                {reward.design.imageUrl ? 'AI 生图素材' : '公会手绘部件'}
              </p>
              <Link
                to={`/quests/${reward.questId}`}
                className="flex justify-center text-[10px] text-[#716449]"
              >
                回看这场冒险 →
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="这里会收藏你完成过的故事"
          description="AI 会为任务设计一件纪念物，通关后就能永久收入这里。"
          action={
            <Link to="/quests/new">
              <Button variant="secondary">
                开启一场冒险
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          }
        />
      )}
    </Card>
  )
}
