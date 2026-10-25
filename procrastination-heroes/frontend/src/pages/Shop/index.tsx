import { Button, Card, Emblem, ErrorState, Loading, Modal, PageTitle } from '@/components/ui'
import type { StoreItem } from '@/objects/economy/StoreItem'
import { useBaseInventory } from '@/pages/hooks/useBaseInventory'
import { ArrowRight, Check, Coins, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
export default function Shop() {
  const b = useBaseInventory()
  const [selected, setSelected] = useState<StoreItem | null>(null)
  const [filter, setFilter] = useState('all')
  if (b.state.status === 'loading') return <Loading />
  if (b.state.status === 'error') return <ErrorState message={b.state.message} retry={b.reload} />
  const data = b.state.data
  return (
    <>
      <PageTitle
        eyebrow="CERTIFIED SECOND-HAND TREASURES"
        title="破烂补给铺"
        description="装备来路正不正经不重要，每一枚冒险币都是你挣的。"
        action={
          <Link to="/base">
            <Button variant="secondary">
              回我的小屋
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#cabb9e] bg-[#eadcc1] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#cabb9e] text-[#716449]">
            <Coins className="size-5" />
          </span>
          <div>
            <p className="text-[10px] text-[#716449]">我的冒险币</p>
            <p className="mt-1 text-xl font-semibold text-[#716449]">
              {data.progress.coins}
              <span className="ml-2 text-[10px] font-normal">每一枚，都来自你完成的一小步。</span>
            </p>
          </div>
        </div>
        <Link to="/quests" className="text-xs text-[#716449]">
          去完成任务赚冒险币 →
        </Link>
      </div>
      {b.notice && (
        <p role="status" className="mb-4 rounded-xl bg-[#eadcc1] p-3 text-xs text-[#716449]">
          {b.notice}
        </p>
      )}
      {b.error && (
        <div className="mb-4">
          <ErrorState message={b.error} />
        </div>
      )}
      <div className="mb-5 flex gap-2">
        {[
          ['all', '全部装饰'],
          ['owned', '我的收藏'],
          ['affordable', '现在买得起'],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`rounded-lg px-4 py-2 text-xs ${filter === v ? 'bg-[#eadcc1] text-[#716449]' : 'text-[#8a785d]'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {data.items
          .filter((i) =>
            filter === 'owned'
              ? data.owned.some((o) => o.itemId === i.id)
              : filter === 'affordable'
                ? i.price <= data.progress.coins
                : true,
          )
          .map((item) => {
            const owned = data.owned.some((o) => o.itemId === item.id)
            return (
              <Card key={item.id}>
                <div className="mb-5 flex h-36 items-center justify-center rounded-xl bg-[#fff8e7]">
                  <Emblem
                    itemId={item.id}
                    symbol={item.symbol}
                    palette={item.palette}
                    size="large"
                  />
                </div>
                <h2 className="text-sm font-semibold text-[#716449]">{item.name}</h2>
                <p className="mt-2 text-[11px] leading-6 text-[#8a785d]">{item.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm font-semibold text-[#716449]">
                    <Coins className="size-3.5" />
                    {item.price}
                  </span>
                  <Button
                    className="min-h-8 px-3 py-1.5 text-[10px]"
                    variant={owned ? 'secondary' : 'primary'}
                    disabled={owned || b.busy}
                    onClick={() => setSelected(item)}
                  >
                    {owned ? (
                      <>
                        <Check className="size-3" />
                        已在背包
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="size-3" />
                        老板，包起来
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )
          })}
      </div>
      {selected && (
        <Modal title="本次交易只收冒险币" onClose={() => setSelected(null)}>
          <div className="my-5 flex justify-center">
            <Emblem
              itemId={selected.id}
              symbol={selected.symbol}
              palette={selected.palette}
              size="large"
            />
          </div>
          <h3 className="text-center text-lg font-semibold text-[#716449]">{selected.name}</h3>
          <p className="my-3 text-center text-xs leading-7 text-[#8a785d]">
            {selected.description}
          </p>
          <div className="my-5 flex justify-between rounded-xl bg-white p-4 text-xs text-[#716449]">
            <span>购买价格</span>
            <span>{selected.price} 冒险币</span>
          </div>
          {data.progress.coins < selected.price ? (
            <p className="mb-4 text-center text-xs text-[#716449]">
              还差 {selected.price - data.progress.coins} 枚冒险币，推进任务再回来吧。
            </p>
          ) : (
            <p className="mb-4 text-center text-[11px] text-[#716449]">
              购买后余额：{data.progress.coins - selected.price} 冒险币
            </p>
          )}
          <Button
            className="w-full"
            disabled={b.busy || data.progress.coins < selected.price}
            onClick={() =>
              void b.purchase(selected.id).then((ok) => {
                if (ok) setSelected(null)
              })
            }
          >
            {b.busy ? '正在放进背包…' : '确认购买'}
          </Button>
        </Modal>
      )}
    </>
  )
}
