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
        eyebrow="LITTLE TREASURES"
        title="补给商店"
        description="把努力攒成小小的喜欢，为房间添一点温暖。"
        action={
          <Link to="/base">
            <Button variant="secondary">
              回我的小屋
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e8dfc4] bg-[#f9f3e4] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#efdfb5] text-[#b69751]">
            <Coins className="size-5" />
          </span>
          <div>
            <p className="text-[10px] text-[#b3a273]">我的冒险币</p>
            <p className="mt-1 text-xl font-semibold text-[#a68c4f]">
              {data.progress.coins}
              <span className="ml-2 text-[10px] font-normal">每一枚，都来自你完成的一小步。</span>
            </p>
          </div>
        </div>
        <Link to="/quests" className="text-xs text-[#ae9d69]">
          去完成任务赚冒险币 →
        </Link>
      </div>
      {b.notice && (
        <p role="status" className="mb-4 rounded-xl bg-[#eaf2e0] p-3 text-xs text-[#7d985f]">
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
            className={`rounded-lg px-4 py-2 text-xs ${filter === v ? 'bg-[#e7efdb] text-[#7c975c]' : 'text-[#a3ad94]'}`}
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
                <div className="mb-5 flex h-36 items-center justify-center rounded-xl bg-[#f5f6ed]">
                  <Emblem symbol={item.symbol} palette={item.palette} />
                </div>
                <h2 className="text-sm font-semibold text-[#748b60]">{item.name}</h2>
                <p className="mt-2 text-[11px] leading-6 text-[#a3ae95]">{item.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm font-semibold text-[#b39a5e]">
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
                        带它回家
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )
          })}
      </div>
      {selected && (
        <Modal title="把这份小喜欢带回家" onClose={() => setSelected(null)}>
          <div className="my-5 flex justify-center">
            <Emblem symbol={selected.symbol} palette={selected.palette} size="large" />
          </div>
          <h3 className="text-center text-lg font-semibold text-[#7c9068]">{selected.name}</h3>
          <p className="my-3 text-center text-xs leading-7 text-[#a4ae95]">
            {selected.description}
          </p>
          <div className="my-5 flex justify-between rounded-xl bg-white p-4 text-xs text-[#9b9d7f]">
            <span>购买价格</span>
            <span>{selected.price} 冒险币</span>
          </div>
          {data.progress.coins < selected.price ? (
            <p className="mb-4 text-center text-xs text-[#b29c6d]">
              还差 {selected.price - data.progress.coins} 枚冒险币，推进任务再回来吧。
            </p>
          ) : (
            <p className="mb-4 text-center text-[11px] text-[#9daa8a]">
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
