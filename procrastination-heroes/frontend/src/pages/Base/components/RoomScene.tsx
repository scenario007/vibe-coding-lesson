import { Emblem } from '@/components/ui'
import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
import { Plus } from 'lucide-react'
import { roomSlots } from '../objects/roomSlots'
export function RoomScene({
  data,
  slot,
  setSlot,
}: {
  data: BaseResponse
  slot: RoomSlot
  setSlot: (slot: RoomSlot) => void
}) {
  return (
    <section className="relative aspect-[16/10] min-h-[330px] overflow-hidden rounded-3xl border border-[#dedac6] bg-[#f1e7d0]">
      <img
        src="/assets/room-background.png"
        alt="你的温暖小木屋"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span className="absolute left-4 top-4 rounded-full bg-[#fffcf2cc] px-3 py-1.5 text-[10px] text-[#aa9977]">
        HOME SWEET HOME
      </span>
      {roomSlots.map((s) => {
        const p = data.placements.find((v) => v.slot === s.id)
        const owned = p?.itemId ? data.owned.find((o) => o.id === p.itemId) : null
        const item = owned ? data.items.find((v) => v.id === owned.itemId) : null
        const reward = p?.rewardId ? data.rewards.find((r) => r.id === p.rewardId) : null
        return (
          <button
            key={s.id}
            aria-label={`布置${s.label}`}
            onClick={() => setSlot(s.id)}
            style={{ left: s.x + '%', top: s.y + '%' }}
            className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl p-1.5 transition ${slot === s.id ? 'bg-white/50 ring-2 ring-[#8ba573] ring-offset-2 ring-offset-white/30' : 'hover:bg-white/30'}`}
          >
            {item || reward ? (
              <Emblem
                symbol={item?.symbol || reward?.design.symbol}
                palette={item?.palette || reward?.design.palette}
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-full border border-dashed border-[#b1a27f] bg-[#fff9ec80] text-[#b8a782]">
                <Plus className="size-4" />
              </span>
            )}
            <span className="mt-1 whitespace-nowrap rounded-md bg-[#fffaf0cc] px-2 py-0.5 text-[9px] text-[#a48f68]">
              {item?.name || reward?.design.name || s.label}
            </span>
          </button>
        )
      })}
    </section>
  )
}
