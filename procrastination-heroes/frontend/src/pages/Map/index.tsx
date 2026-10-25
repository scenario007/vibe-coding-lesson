import { Button, Card, Emblem, Modal, PageTitle, Pill, Progress } from '@/components/ui'
import { usePlayer } from '@/system/stores/player'
import { ArrowRight, Check, LockKeyhole, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
const regions = [
  {
    name: '起点营地',
    level: 1,
    symbol: 'leaf',
    palette: 'sage',
    x: 13,
    y: 70,
    description: '每场冒险，都从愿意迈出第一步开始。你已经在路上了。',
  },
  {
    name: '晨光草地',
    level: 2,
    symbol: 'flower',
    palette: 'gold',
    x: 32,
    y: 35,
    description: '一点一点积累的行动，开始在清晨的草地上开花。',
  },
  {
    name: '知识森林',
    level: 3,
    symbol: 'book',
    palette: 'sage',
    x: 52,
    y: 62,
    description: '把好奇心装进行囊，让每一次学习都留下一片叶子。',
  },
  {
    name: '灵感山丘',
    level: 5,
    symbol: 'mountain',
    palette: 'lavender',
    x: 72,
    y: 30,
    description: '走过一些小路以后，你会看见自己的新风景。',
  },
  {
    name: '远望灯塔',
    level: 8,
    symbol: 'lamp',
    palette: 'sky',
    x: 89,
    y: 63,
    description: '那些认真推进过的小事，终于成为能照亮远方的光。',
  },
]
export default function AdventureMap() {
  const { progress } = usePlayer()
  const xp = progress?.experience || 0
  const level = 1 + Math.floor(xp / 100)
  const [selected, setSelected] = useState<(typeof regions)[number] | null>(null)
  const next = regions.find((r) => r.level > level)
  return (
    <>
      <PageTitle
        eyebrow="A MAP DRAWN BETWEEN NAPS"
        title="冒险地图"
        description="协会地图由勇者亲手绘制，比例随缘，进度算数。"
      />
      <section className="relative mb-6 h-[430px] overflow-hidden rounded-3xl border border-[#cabb9e] bg-[#eadcc1] sm:h-[480px]">
        <div className="guild-paper absolute inset-0" />
        <span
          aria-hidden="true"
          className="absolute bottom-10 right-5 rotate-[-14deg] font-serif text-8xl font-black text-[#a94732]/10"
        >
          未探索
        </span>
        <div className="absolute left-6 top-6 rounded-xl border border-white/80 bg-white/70 px-4 py-3 backdrop-blur">
          <p className="text-[9px] tracking-widest text-[#716449]">YOUR JOURNEY</p>
          <p className="mt-1 font-serif text-lg font-bold text-[#665d3e]">
            Lv.{level} · 已点亮 {regions.filter((r) => r.level <= level).length} 个区域
          </p>
        </div>
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          <path
            d="M130 700 C200 650 210 350 320 350 S400 720 520 620 S600 310 720 300 S820 450 890 630"
            fill="none"
            stroke="#8a785d"
            strokeWidth="5"
            strokeDasharray="10 12"
            opacity=".7"
          />
        </svg>
        {regions.map((r) => {
          const unlocked = level >= r.level
          return (
            <button
              key={r.name}
              onClick={() => setSelected(r)}
              style={{ left: r.x + '%', top: r.y + '%' }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 text-center transition hover:-translate-y-[55%] ${unlocked ? '' : 'grayscale opacity-65'}`}
            >
              <div className="relative mx-auto mb-3 flex justify-center">
                <Emblem symbol={r.symbol} palette={r.palette} size="normal" />
                <span className="absolute -bottom-1 right-0 grid size-6 place-items-center rounded-full border-2 border-white bg-[#716449] text-white">
                  {unlocked ? <Check className="size-3" /> : <LockKeyhole className="size-3" />}
                </span>
              </div>
              <span className="whitespace-nowrap rounded-lg bg-[#fff8e7]/90 px-3 py-1.5 text-xs font-semibold text-[#716449]">
                {r.name}
              </span>
              <span className="mt-2 block text-[9px] text-[#716449]">
                {unlocked ? '已抵达' : `Lv.${r.level} 解锁`}
              </span>
            </button>
          )
        })}
        <p className="absolute bottom-5 left-0 right-0 text-center text-[10px] tracking-wide text-[#716449]">
          点击一个地点，看看它想对你说什么。
        </p>
      </section>
      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <Pill>
            <MapPin className="size-3" />
            下一站
          </Pill>
          <h2 className="mt-4 font-serif text-xl font-bold text-[#665d3e]">
            {next?.name || '继续自己的故事'}
          </h2>
          <p className="my-4 text-xs leading-7 text-[#716449]">
            {next
              ? `再积累 ${Math.max(0, (next.level - 1) * 100 - xp)} XP，就能抵达下一片风景。`
              : '地图上的区域已经点亮，新的目标还在生活里等着你。'}
          </p>
          <Progress value={next ? (xp / ((next.level - 1) * 100)) * 100 : 100} />
        </Card>
        <Card className="flex flex-col justify-center bg-[#eadcc1]">
          <p className="text-sm leading-8 text-[#716449]">“地图很大，但今天只需要走一步。”</p>
          <Link className="mt-4 inline-flex items-center gap-2 text-xs text-[#716449]" to="/quests">
            去推进我的任务
            <ArrowRight className="size-3.5" />
          </Link>
        </Card>
      </div>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="my-5 flex justify-center">
            <Emblem symbol={selected.symbol} palette={selected.palette} size="large" />
          </div>
          <p className="text-center text-sm leading-8 text-[#716449]">{selected.description}</p>
          <p className="my-5 text-center text-xs text-[#8a785d]">
            {level >= selected.level
              ? '你已经用自己的行动点亮了这里。'
              : `达到 Lv.${selected.level} 后解锁，还差 ${Math.max(0, (selected.level - 1) * 100 - xp)} XP。`}
          </p>
          <Link to="/quests">
            <Button className="w-full" onClick={() => setSelected(null)}>
              继续我的冒险
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </Modal>
      )}
    </>
  )
}
