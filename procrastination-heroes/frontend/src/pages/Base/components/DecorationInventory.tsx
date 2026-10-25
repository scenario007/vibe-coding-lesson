import { Button, Card, Emblem, EmptyState, Pill } from '@/components/ui'
import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
import { useBaseInventory } from '@/pages/hooks/useBaseInventory'
import { Check, LockKeyhole, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { roomSlots } from '../objects/roomSlots'
export function DecorationInventory({
  data,
  slot,
  setSlot,
  b,
  candidates,
  placed,
}: {
  data: BaseResponse
  slot: RoomSlot
  setSlot: (slot: RoomSlot) => void
  b: ReturnType<typeof useBaseInventory>
  candidates: BaseResponse['owned']
  placed: BaseResponse['placements'][number] | undefined
}) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold">
        布置{roomSlots.find((s) => s.id === slot)?.label}
      </h2>
      <div className="mb-5 flex flex-wrap gap-2">
        {roomSlots.map((s) => (
          <button
            key={s.id}
            onClick={() => setSlot(s.id)}
            className={`rounded-lg px-2.5 py-2 text-[10px] ${slot === s.id ? 'bg-[#eadcc1] font-medium text-[#716449]' : 'bg-[#fff8e7] text-[#716449]'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {candidates.map((o) => {
          const item = data.items.find((i) => i.id === o.itemId)!
          const selected = placed?.itemId === o.id
          return (
            <button
              disabled={b.busy}
              key={o.id}
              onClick={() => void b.place(slot, o.id, null)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selected ? 'border-[#8a785d] bg-[#fff8e7]' : 'border-[#eadcc1] hover:bg-[#fff8e7]'}`}
            >
              <Emblem itemId={item.id} symbol={item.symbol} palette={item.palette} size="small" />
              <span className="flex-1 text-xs text-[#716449]">{item.name}</span>
              {selected ? (
                <Check className="size-4 text-[#716449]" />
              ) : (
                <Plus className="size-4 text-[#8a785d]" />
              )}
            </button>
          )
        })}
        {slot === 'wall' &&
          data.rewards.map((r) => (
            <button
              disabled={b.busy}
              key={r.id}
              onClick={() => void b.place('wall', null, r.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${placed?.rewardId === r.id ? 'border-[#8a785d] bg-[#fff8e7]' : 'border-[#eadcc1]'}`}
            >
              <Emblem symbol={r.design.symbol} palette={r.design.palette} size="small" />
              <span className="flex-1">
                <span className="block text-xs text-[#716449]">{r.design.name}</span>
                <span className="mt-1 block text-[9px] text-[#716449]">任务专属纪念画</span>
              </span>
              {placed?.rewardId === r.id && <Check className="size-4 text-[#716449]" />}
            </button>
          ))}
      </div>
      {!candidates.length && !(slot === 'wall' && data.rewards.length) && (
        <EmptyState
          title="这里还空着"
          description="去商店挑一件装饰，或完成任务解锁专属纪念画。"
          action={
            <Link to="/shop">
              <Button variant="secondary">去看看</Button>
            </Link>
          }
        />
      )}{' '}
      {placed && (
        <Button
          className="mt-4 w-full"
          disabled={b.busy}
          variant="ghost"
          onClick={() => void b.place(slot, null, null)}
        >
          先把这里留空
        </Button>
      )}
      <div className="mt-5 rounded-xl bg-[#eadcc1] p-4">
        <div className="mb-2 flex items-center gap-1">
          <LockKeyhole className="size-3 text-[#716449]" />
          <Pill tone="gold">努力会留下形状</Pill>
        </div>
        <p className="text-[10px] leading-6 text-[#716449]">
          尚未完成的任务奖励，先在任务页预览。通关后，就能带回这里。
        </p>
      </div>
    </Card>
  )
}
