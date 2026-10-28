import { Button, Card, Emblem, ErrorState, Loading, PageTitle } from '@/components/ui'
import type { RewardPalette } from '@/objects/economy/RewardPalette'
import type { RewardSymbol } from '@/objects/economy/RewardSymbol'
import type { RoomSlot } from '@/objects/economy/RoomSlot'
import { useBaseInventory } from '@/pages/hooks/useBaseInventory'
import { Coins, Hammer, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const slots: Array<[RoomSlot, string]> = [
  ['desk', '工作台'],
  ['wall', '墙面'],
  ['floor', '地面'],
  ['lighting', '照明'],
  ['window', '窗边'],
  ['chair', '座椅'],
]
function previewFor(prompt: string): { symbol: RewardSymbol; palette: RewardPalette } {
  if (prompt.includes('灯'))
    return { symbol: 'lamp', palette: prompt.includes('红') ? 'rose' : 'gold' }
  if (prompt.includes('植物') || prompt.includes('花')) return { symbol: 'leaf', palette: 'sage' }
  if (prompt.includes('椅')) return { symbol: 'cloud', palette: 'sky' }
  if (prompt.includes('柜') || prompt.includes('书')) return { symbol: 'book', palette: 'sage' }
  return { symbol: 'star', palette: 'sage' }
}

export default function Shop() {
  const b = useBaseInventory()
  const [prompt, setPrompt] = useState('')
  const [slot, setSlot] = useState<RoomSlot>('desk')
  if (b.state.status === 'loading') return <Loading />
  if (b.state.status === 'error') return <ErrorState message={b.state.message} retry={b.reload} />
  const data = b.state.data
  const customItems = data.items.filter((item) => item.id.startsWith('custom-'))
  return (
    <>
      <PageTitle
        eyebrow="CUSTOM SUPPLY WORKSHOP"
        title="破烂补给铺"
        description="这里不卖现成货。描述你想要的家具，协会按你的据点气质做一件。"
        action={
          <Link to="/base">
            <Button variant="secondary">回我的自由据点</Button>
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
            <p className="mt-1 text-xl font-semibold text-[#716449]">{data.progress.coins}</p>
          </div>
        </div>
        <p className="text-[10px] leading-5 text-[#716449]">
          每次定制消耗 5 冒险币 · 参数会保存在素材库
        </p>
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
      <div className="grid items-start gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[#a94732] text-white">
              <Hammer className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#665d3e]">描述一件你想要的家具</h2>
              <p className="mt-1 text-[10px] text-[#8a785d]">比如：一张能提醒我别摸鱼的歪桌子</p>
            </div>
          </div>
          <textarea
            className="min-h-32 w-full rounded-xl border border-[#cabb9e] bg-[#fff8e7] p-4 text-sm leading-7 text-[#665d3e] outline-none focus:border-[#a94732]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={160}
            placeholder="它长什么样？用来做什么？希望是什么感觉？"
          />
          <label className="mt-5 grid gap-2 text-xs text-[#716449]">
            放在哪里
            <select
              className="rounded-xl border border-[#cabb9e] bg-[#fff8e7] px-3 py-3 text-xs"
              value={slot}
              onChange={(e) => setSlot(e.target.value as RoomSlot)}
            >
              {slots.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-4 rounded-xl bg-[#eadcc1] p-3 text-[10px] leading-5 text-[#716449]">
            家具外形、材质和配色由你的描述生成；这里只需要告诉协会它最后放在哪里。
          </p>
          <Button
            className="mt-5 w-full"
            disabled={b.busy || prompt.trim().length < 2 || data.progress.coins < 5}
            onClick={() =>
              void b.customize(prompt, slot).then((ok) => {
                if (ok) setPrompt('')
              })
            }
          >
            <Sparkles className="size-4" />
            {b.busy ? '正在制作参数草案…' : '消耗 5 冒险币，定制我的家具'}
          </Button>
          <p className="mt-3 text-center text-[10px] leading-5 text-[#8a785d]">
            已配置阿里云图片 Key 时会生成 1K AI 家具图并保存到素材库；未配置时保留公会手绘 SVG
            兜底。
          </p>
        </Card>
        <Card className="bg-[#eadcc1]">
          <p className="text-[10px] tracking-widest text-[#8a785d]">PREVIEW</p>
          <div className="my-7 flex justify-center">
            <Emblem
              itemId="custom-preview"
              symbol={previewFor(prompt).symbol}
              palette={previewFor(prompt).palette}
              size="large"
            />
          </div>
          <h2 className="text-center font-serif text-xl font-bold text-[#665d3e]">
            {prompt.trim() || '还没写下家具想法'}
          </h2>
          <p className="mt-3 text-center text-xs leading-6 text-[#716449]">
            {slots.find(([v]) => v === slot)?.[1]} · 仅为手绘草图预览
          </p>
        </Card>
      </div>
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#665d3e]">我的定制素材库</h2>
          <span className="text-[10px] text-[#8a785d]">{customItems.length} 件</span>
        </div>
        {customItems.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {customItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-[#eadcc1] bg-[#fff8e7] p-3"
              >
                <Emblem
                  itemId={item.id}
                  symbol={item.symbol}
                  palette={item.palette}
                  imageUrl={item.imageUrl}
                  size="small"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#665d3e]">{item.name}</p>
                  <p className="mt-1 text-[10px] text-[#8a785d]">可拖进自由据点</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-xs leading-6 text-[#8a785d]">
            还没有定制素材。先写一句需求，让据点长出一点你的性格。
          </p>
        )}
      </Card>
    </>
  )
}
