import { Button, Card, ErrorState, Loading, PageTitle } from '@/components/ui'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
import { useBaseInventory } from '@/pages/hooks/useBaseInventory'
import { Package, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DecorationInventory } from './components/DecorationInventory'
import { RoomScene } from './components/RoomScene'
export default function Base() {
  const b = useBaseInventory()
  const [slot, setSlot] = useState<RoomSlot>('wall')
  if (b.state.status === 'loading') return <Loading />
  if (b.state.status === 'error') return <ErrorState message={b.state.message} retry={b.reload} />
  const data = b.state.data
  const placed = data.placements.find((p) => p.slot === slot)
  const candidates = data.owned.filter((o) =>
    data.items.some((i) => i.id === o.itemId && i.slot === slot),
  )
  return (
    <>
      <PageTitle
        eyebrow="A PLACE TO CALL YOUR OWN"
        title="我的据点"
        description="把每一次努力，放进属于自己的小屋。"
        action={
          <Link to="/shop">
            <Button variant="secondary">
              <ShoppingBag className="size-4" />
              去补给商店
            </Button>
          </Link>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div>
          <RoomScene data={data} slot={slot} setSlot={setSlot} />
          <p className="mt-3 text-[10px] leading-6 text-[#8a785d]">
            点击小屋中的位置，再从背包选择装饰。纪念画可以放在墙面，固定槽位布局会自动保存。
          </p>
          {b.notice && (
            <p role="status" className="mt-3 rounded-xl bg-[#eadcc1] p-3 text-xs text-[#716449]">
              {b.notice}
            </p>
          )}
          {b.error && <ErrorState message={b.error} />}
          <Card className="mt-5">
            <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold">
              <Package className="size-4 text-[#716449]" />
              这间小屋的收藏
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-serif text-2xl text-[#716449]">{data.owned.length}</p>
                <p className="mt-1 text-[10px] text-[#8a785d]">已购装饰</p>
              </div>
              <div>
                <p className="font-serif text-2xl text-[#716449]">{data.rewards.length}</p>
                <p className="mt-1 text-[10px] text-[#8a785d]">专属纪念物</p>
              </div>
              <div>
                <p className="font-serif text-2xl text-[#716449]">{data.placements.length}/6</p>
                <p className="mt-1 text-[10px] text-[#8a785d]">已布置位置</p>
              </div>
            </div>
          </Card>
        </div>
        <DecorationInventory
          data={data}
          slot={slot}
          setSlot={setSlot}
          b={b}
          candidates={candidates}
          placed={placed}
        />
      </div>
    </>
  )
}
