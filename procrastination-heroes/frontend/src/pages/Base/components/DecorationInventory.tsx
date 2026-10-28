import { Button, Card, Emblem, EmptyState, Pill } from '@/components/ui'
import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import { useBaseInventory } from '@/pages/hooks/useBaseInventory'
import { Check, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DecorationInventory({
  data,
  b,
}: {
  data: BaseResponse
  b: ReturnType<typeof useBaseInventory>
}) {
  const placedItems = new Set(data.placements.flatMap((p) => (p.itemId ? [p.itemId] : [])))
  const placedRewards = new Set(data.placements.flatMap((p) => (p.rewardId ? [p.rewardId] : [])))
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">据点素材库</h2>
          <p className="mt-1 text-[10px] text-[#8a785d]">不分区域，想放哪里就放哪里。</p>
        </div>
        <Pill tone="gold">自由画布</Pill>
      </div>
      <div className="space-y-3">
        {data.owned.map((owned) => {
          const item = data.items.find((i) => i.id === owned.itemId)
          if (!item) return null
          const selected = placedItems.has(owned.id)
          return (
            <button
              disabled={b.busy}
              key={owned.id}
              onClick={() => void b.place(crypto.randomUUID(), owned.id, null)}
              className="flex w-full items-center gap-3 rounded-xl border border-[#eadcc1] bg-[#fff8e7] p-3 text-left hover:bg-[#eadcc1]"
            >
              <Emblem
                itemId={item.id}
                symbol={item.symbol}
                palette={item.palette}
                imageUrl={item.imageUrl}
                size="small"
              />
              <span className="flex-1 text-xs text-[#716449]">{item.name}</span>
              {selected ? (
                <Check className="size-4 text-[#716449]" />
              ) : (
                <Plus className="size-4 text-[#8a785d]" />
              )}
            </button>
          )
        })}
        {data.rewards.map((reward) => {
          const selected = placedRewards.has(reward.id)
          return (
            <button
              disabled={b.busy}
              key={reward.id}
              onClick={() => void b.place(crypto.randomUUID(), null, reward.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-[#eadcc1] bg-[#fff8e7] p-3 text-left hover:bg-[#eadcc1]"
            >
              <Emblem
                symbol={reward.design.symbol}
                palette={reward.design.palette}
                imageUrl={reward.design.imageUrl}
                size="small"
              />
              <span className="flex-1">
                <span className="block text-xs text-[#716449]">{reward.design.name}</span>
                <span className="mt-1 block text-[9px] text-[#8a785d]">任务专属奖品</span>
              </span>
              {selected ? (
                <Check className="size-4 text-[#716449]" />
              ) : (
                <Plus className="size-4 text-[#8a785d]" />
              )}
            </button>
          )
        })}
      </div>
      {!data.owned.length && !data.rewards.length && (
        <EmptyState
          title="素材库还是空的"
          description="先完成任务，或者去定制一件家具。"
          action={
            <Link to="/shop">
              <Button variant="secondary">去定制家具</Button>
            </Link>
          }
        />
      )}
      <div className="mt-5 rounded-xl bg-[#eadcc1] p-4">
        <p className="text-[10px] leading-6 text-[#716449]">
          点击素材放入画布，再直接拖动它。没有墙面、地面或家具类别的限制。
        </p>
      </div>
    </Card>
  )
}
