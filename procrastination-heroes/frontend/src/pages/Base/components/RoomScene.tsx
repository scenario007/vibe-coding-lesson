import { Emblem } from '@/components/ui'
import { useGuildAsset } from '@/components/ui/AtlasSprite'
import { useState } from 'react'
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
  const background = useGuildAsset('room')
  const [failed, setFailed] = useState(false)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('guild-base-positions') || '{}')
    } catch {
      return {}
    }
  })
  const [dragging, setDragging] = useState<string | null>(null)
  function move(event: React.PointerEvent<HTMLElement>) {
    if (!dragging) return
    const rect = event.currentTarget.getBoundingClientRect()
    const next = {
      x: Math.min(94, Math.max(6, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(88, Math.max(12, ((event.clientY - rect.top) / rect.height) * 100)),
    }
    setPositions((current) => ({ ...current, [dragging]: next }))
  }
  function finishDrag() {
    if (!dragging) return
    window.localStorage.setItem('guild-base-positions', JSON.stringify(positions))
    setDragging(null)
  }
  return (
    <section
      onPointerMove={move}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      className="relative aspect-[16/10] min-h-[340px] overflow-hidden rounded-[6px_18px_8px_13px] border-2 border-[#332820] bg-[#e8d6b0] shadow-[4px_5px_0_#332820]"
    >
      <svg
        viewBox="0 0 1000 625"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="公会原创手绘小屋，空墙与旧木工作台"
        aria-hidden={Boolean(background) && !failed}
        className="absolute inset-0 h-full w-full"
        fill="none"
        stroke="#332820"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M0 0h1000v625H0Z" fill="#eee0b9" />
        <path d="M0 420q500-15 1000 0v205H0Z" fill="#bd9469" />
        <path
          d="M0 419q480-14 1000 0M0 461l1000 5M0 524l1000 3M0 594l1000-3M184 424l-45 201m244-204-9 204m223-206 30 206m195-206 57 206"
          opacity=".65"
        />
        <path
          d="M0 0h1000v44Q503 26 0 44ZM38 30l24 440 27-1-14-432M922 33l-11 438 30-1 19-436"
          fill="#96704d"
        />
        <path d="M99 130h118l7 183-126 2Z" fill="#bac2a0" />
        <path d="m95 124 125-1 10 198-139 1Zm60 5 3 183m-58-94 123-2" strokeWidth="8" />
        <path d="m118 145 16 48m-19 14 7 22" stroke="#fff8e7" strokeWidth="6" />
        <path
          d="m22 457 164-6 11 24-178 9Zm11 26 5 92h16l11-95m92-4 8 103h15l-3-104"
          fill="#9d7450"
        />
        <path d="m57 451 43-4 1-13-45 4Z" fill="#fff8e7" />
        <path d="M799 260h151l-4 22-150-4Zm18 23-9 86m122-84 9 81" fill="#9d7450" />
        <path d="m861 93 60 8-6 96-24-13-18 14-14-27Z" fill="#a94732" />
        <path d="m878 106 3 57m19-55 3 64m-153 203 22-4m-528-11 34 2m153-118 17 3" opacity=".4" />
        <path d="m72 602 50-5m184-38 36 1m367 47 45-4m67-106 29 2m-605-33 22 2" opacity=".45" />
      </svg>
      {background && !failed && (
        <img
          src={background}
          alt="炭黑手绘线条、空墙和旧工作台组成的公会小屋"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}
      {(!background || failed) && (
        <span className="absolute bottom-3 left-4 text-[9px] text-[#62503c]">公会原创手绘场景</span>
      )}
      <span className="absolute left-4 top-4 -rotate-2 border border-[#332820] bg-[#fff8e7]/95 px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#332820] shadow-[2px_2px_0_#332820]">
        勇者据点 · 自由画布
      </span>
      {roomSlots.map((s) => {
        const p = data.placements.find((v) => v.slot === s.id)
        const owned = p?.itemId ? data.owned.find((o) => o.id === p.itemId) : null
        const item = owned ? data.items.find((v) => v.id === owned.itemId) : null
        const reward = p?.rewardId ? data.rewards.find((r) => r.id === p.rewardId) : null
        const key = item?.id || reward?.id || s.id
        const position = positions[key] || { x: s.x, y: s.y }
        return (
          <button
            key={s.id}
            onPointerDown={(event) => {
              event.preventDefault()
              setDragging(key)
              event.currentTarget.setPointerCapture?.(event.pointerId)
            }}
            aria-label={`布置${s.label}`}
            aria-pressed={slot === s.id}
            onClick={() => setSlot(s.id)}
            style={{ left: position.x + '%', top: position.y + '%' }}
            className={`group absolute grid -translate-x-1/2 -translate-y-1/2 justify-items-center rounded-md p-1.5 transition ${slot === s.id ? 'outline-2 outline-offset-2 outline-dashed outline-[#a94732]' : 'hover:bg-[#fff8e7]/30'}`}
          >
            {item || reward ? (
              <span className="drop-shadow-[2px_4px_0_#33282025] transition-transform group-hover:-translate-y-1">
                <Emblem
                  itemId={item?.id}
                  symbol={item?.symbol || reward?.design.symbol}
                  palette={item?.palette || reward?.design.palette}
                />
              </span>
            ) : (
              <span className="grid size-9 place-items-center rounded-full border border-dashed border-[#74614c] bg-[#fff8e7]/70 text-[#74614c]">
                <Plus className="size-4" />
              </span>
            )}
            <span className="mt-1 max-w-32 rounded-sm border border-[#b8a17a]/70 bg-[#fff8e7]/95 px-2 py-0.5 text-center text-[10px] leading-4 text-[#62503c]">
              {item?.name || reward?.design.name || s.label}
            </span>
          </button>
        )
      })}
    </section>
  )
}
