import { Button, Card, Emblem, EmptyState } from '@/components/ui'
import type { DashboardResponse } from '@/objects/adventure/apiTypes/DashboardResponse'
import { ArrowRight, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
export function MemoryGallery({ data }: { data: DashboardResponse }) {
  return (
    <Card className="mb-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="size-4 text-[#baac7b]" />
          任务专属纪念图鉴
        </h2>
        <span className="text-[10px] text-[#b1b79d]">每件藏品，都有一个完成过的故事</span>
      </div>
      {data.rewards.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.rewards.map((reward) => (
            <div key={reward.id} className="rounded-xl border border-[#e9e6d7] bg-[#faf8ef] p-5">
              <div className="mb-4 flex justify-center">
                <Emblem symbol={reward.design.symbol} palette={reward.design.palette} />
              </div>
              <h3 className="text-center text-sm font-semibold text-[#96865c]">
                {reward.design.name}
              </h3>
              <p className="mt-3 text-center text-[11px] leading-6 text-[#ada388]">
                {reward.design.story}
              </p>
              <p className="my-3 text-center text-[9px] text-[#b8b09a]">
                {new Date(reward.unlockedAt).toLocaleDateString('zh-CN')} 解锁 · 模板呈现
              </p>
              <Link
                to={`/quests/${reward.questId}`}
                className="flex justify-center text-[10px] text-[#91a17b]"
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
