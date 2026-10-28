import { Emblem } from '@/components/ui'
import { useGuildAsset } from '@/components/ui/AtlasSprite'
import type { BaseResponse } from '@/objects/economy/apiTypes/BaseResponse'
import { useEffect, useState } from 'react'

export function RoomScene({
  data,
  onMove,
}: {
  data: BaseResponse
  onMove: (id: string, x: number, y: number) => Promise<boolean>
}) {
  const background = useGuildAsset('room')
  const [failed, setFailed] = useState(false)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => {
    setPositions((current) =>
      Object.fromEntries(data.placements.map((p) => [p.id, current[p.id] || { x: p.x, y: p.y }])),
    )
  }, [data.placements])

  function move(event: React.PointerEvent<HTMLElement>) {
    if (!dragging) return
    const rect = event.currentTarget.getBoundingClientRect()
    const next = {
      x: Math.min(96, Math.max(4, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(92, Math.max(8, ((event.clientY - rect.top) / rect.height) * 100)),
    }
    setPositions((current) => ({ ...current, [dragging]: next }))
  }

  async function finishDrag() {
    if (!dragging) return
    const position = positions[dragging]
    setDragging(null)
    if (position) await onMove(dragging, Math.round(position.x), Math.round(position.y))
  }

  return (
    <section
      onPointerMove={move}
      onPointerUp={() => void finishDrag()}
      onPointerCancel={() => void finishDrag()}
      className="relative aspect-[16/10] min-h-[340px] overflow-hidden rounded-[6px_18px_8px_13px] border-2 border-[#332820] bg-[#e8d6b0] shadow-[4px_5px_0_#332820]"
    >
      <svg
        viewBox="0 0 1000 625"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="公会原创手绘自由据点画布"
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
      </svg>
      {background && !failed && (
        <img
          src={background}
          alt="炭黑手绘线条、空墙和旧木工作台组成的公会小屋"
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
      {data.placements.map((placement) => {
        const owned = placement.itemId ? data.owned.find((o) => o.id === placement.itemId) : null
        const item = owned ? data.items.find((v) => v.id === owned.itemId) : null
        const reward = placement.rewardId
          ? data.rewards.find((r) => r.id === placement.rewardId)
          : null
        const position = positions[placement.id] || { x: placement.x, y: placement.y }
        return (
          <button
            key={placement.id}
            aria-label={`移动${item?.name || reward?.design.name || '纪念物'}`}
            onPointerDown={(event) => {
              event.preventDefault()
              setDragging(placement.id)
              event.currentTarget.setPointerCapture?.(event.pointerId)
            }}
            style={{ left: position.x + '%', top: position.y + '%' }}
            className="group absolute grid -translate-x-1/2 -translate-y-1/2 touch-none justify-items-center rounded-md p-1.5 transition hover:bg-[#fff8e7]/30"
          >
            <span className="drop-shadow-[2px_4px_0_#33282025] transition-transform group-hover:-translate-y-1">
              <Emblem
                itemId={item?.id}
                symbol={item?.symbol || reward?.design.symbol}
                palette={item?.palette || reward?.design.palette}
              />
            </span>
            <span className="mt-1 max-w-32 rounded-sm border border-[#b8a17a]/70 bg-[#fff8e7]/95 px-2 py-0.5 text-center text-[10px] leading-4 text-[#62503c]">
              {item?.name || reward?.design.name || '据点纪念物'}
            </span>
          </button>
        )
      })}
      {!data.placements.length && (
        <p className="absolute inset-0 grid place-items-center text-xs text-[#716449]">
          从右侧素材库放进第一件东西吧。
        </p>
      )}
      <p className="absolute bottom-3 right-4 text-[9px] text-[#62503c]">
        拖动任意素材，自由安排位置
      </p>
    </section>
  )
}
