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
            className={`rounded-lg px-2.5 py-2 text-[10px] ${slot === s.id ? 'bg-[#e8efdd] font-medium text-[#7c965e]' : 'bg-[#f4f5ee] text-[#9da78e]'}`}
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
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selected ? 'border-[#adc799] bg-[#f2f8eb]' : 'border-[#e6eadc] hover:bg-[#f8faf1]'}`}
            >
              <Emblem symbol={item.symbol} palette={item.palette} size="small" />
              <span className="flex-1 text-xs text-[#82966b]">{item.name}</span>
              {selected ? (
                <Check className="size-4 text-[#8daa72]" />
              ) : (
                <Plus className="size-4 text-[#b4c2a4]" />
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
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${placed?.rewardId === r.id ? 'border-[#cbb77f] bg-[#fbf6e7]' : 'border-[#e6eadc]'}`}
            >
              <Emblem symbol={r.design.symbol} palette={r.design.palette} size="small" />
              <span className="flex-1">
                <span className="block text-xs text-[#94855b]">{r.design.name}</span>
                <span className="mt-1 block text-[9px] text-[#b3a783]">任务专属纪念画</span>
              </span>
              {placed?.rewardId === r.id && <Check className="size-4 text-[#b6a16b]" />}
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
      <div className="mt-5 rounded-xl bg-[#f6f3e8] p-4">
        <div className="mb-2 flex items-center gap-1">
          <LockKeyhole className="size-3 text-[#b8aa7b]" />
          <Pill tone="gold">努力会留下形状</Pill>
        </div>
        <p className="text-[10px] leading-6 text-[#aba084]">
          尚未完成的任务奖励，先在任务页预览。通关后，就能带回这里。
        </p>
      </div>
    </Card>
  )
}
