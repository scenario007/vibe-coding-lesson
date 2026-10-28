import {
  Button,
  Card,
  Emblem,
  EmptyState,
  ErrorState,
  inputClass,
  Loading,
  PageTitle,
  Pill,
  Progress,
} from '@/components/ui'
import { categories, dateLabel, statuses, tiers } from '@/pages/objects/labels'
import { ArrowUpRight, Plus, ScrollText, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useQuests } from './hooks/useQuests'

type MemoNote = { id: string; text: string; color: string; rotation: number }
const memoColors = ['#f5d993', '#dce1bd', '#f0c9ae', '#cfe4df', '#e3d4e6']

function readMemoNotes(): MemoNote[] {
  try {
    const saved = window.localStorage.getItem('guild-board-memos')
    if (saved) return JSON.parse(saved) as MemoNote[]
    const legacy = window.localStorage.getItem('guild-board-memo')
    return legacy
      ? [{ id: crypto.randomUUID(), text: legacy, color: memoColors[0], rotation: -2 }]
      : []
  } catch {
    return []
  }
}
export default function Quests() {
  const q = useQuests()
  const [memoDraft, setMemoDraft] = useState('')
  const [memoNotes, setMemoNotes] = useState<MemoNote[]>(readMemoNotes)
  function addMemo() {
    const text = memoDraft.trim()
    if (!text) return
    const note = {
      id: crypto.randomUUID(),
      text,
      color: memoColors[memoNotes.length % memoColors.length],
      rotation: memoNotes.length % 2 ? 2 : -2,
    }
    const next = [note, ...memoNotes]
    setMemoNotes(next)
    window.localStorage.setItem('guild-board-memos', JSON.stringify(next))
    window.localStorage.removeItem('guild-board-memo')
    setMemoDraft('')
  }
  function removeMemo(id: string) {
    const next = memoNotes.filter((note) => note.id !== id)
    setMemoNotes(next)
    window.localStorage.setItem('guild-board-memos', JSON.stringify(next))
  }
  return (
    <>
      <PageTitle
        eyebrow="QUEST BOARD"
        title="委托公告板"
        description="大事小事都能接。先撕一张委托，再考虑拯救世界。"
        action={
          <Link to="/quests/new">
            <Button>
              <Plus className="size-4" />
              新的冒险
            </Button>
          </Link>
        }
      />
      <section className="guild-board mb-6 rounded-lg border-[3px] border-[#332820] p-5 shadow-[5px_6px_0_#33282035]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 text-[#fff8e7]">
          <div>
            <p className="text-[9px] tracking-[.25em] text-[#e4c78e]">PRIVATE NOTICE WALL</p>
            <h2 className="mt-1 font-serif text-xl font-bold">公会备忘板</h2>
            <p className="mt-1 text-[10px] text-[#e8d7b5]">
              写一张纸条钉上去；点击纸条，就把它撕掉。
            </p>
          </div>
          <span className="text-[10px] text-[#e8d7b5]">{memoNotes.length} 张纸条</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-10 flex-1 rounded-md border-2 border-[#332820] bg-[#fff8e7] px-3 text-xs text-[#665d3e] outline-none"
            value={memoDraft}
            maxLength={160}
            onChange={(e) => setMemoDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMemo()
            }}
            placeholder="例如：周五问老师科研项目截止时间"
          />
          <Button variant="secondary" className="min-h-10 px-4 text-xs" onClick={addMemo}>
            钉上纸条
          </Button>
        </div>
        <div className="mt-5 grid min-h-28 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {memoNotes.map((note) => (
            <button
              type="button"
              key={note.id}
              title="点击消除这张备忘"
              onClick={() => removeMemo(note.id)}
              style={{ backgroundColor: note.color, transform: `rotate(${note.rotation}deg)` }}
              className="relative min-h-24 border-2 border-[#332820]/70 p-4 text-left text-xs leading-6 text-[#4c3b2a] shadow-[3px_4px_0_#33282055] transition hover:-translate-y-1 hover:rotate-0"
            >
              <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full border-2 border-[#332820] bg-[#a94732]" />
              {note.text}
              <span className="mt-3 block text-[9px] text-[#806b4e]">点击消除</span>
            </button>
          ))}
          {!memoNotes.length && (
            <p className="col-span-full grid place-items-center py-5 text-xs text-[#e8d7b5]">
              这块板子还空着，写一张提醒自己的纸条吧。
            </p>
          )}
        </div>
      </section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 rounded-xl border border-[#cabb9e] bg-[#eadcc1] p-1">
          {[
            ['active', '进行中'],
            ['draft', '草稿'],
            ['completed', '已通关'],
            ['archived', '已归档'],
            ['all', '全部'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => q.setFilter(v)}
              className={`rounded-lg px-3 py-2 text-xs ${q.filter === v ? 'bg-white font-medium text-[#665d3e] shadow-sm' : 'text-[#716449]'}`}
            >
              {l}
              <span className="ml-1 text-[9px]">
                {q.quests.filter((x) => v === 'all' || x.quest.status === v).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            aria-label="任务分类"
            className={inputClass + ' max-w-32'}
            value={q.category}
            onChange={(e) => q.setCategory(e.target.value)}
          >
            <option value="all">全部分类</option>
            {Object.entries(categories).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 size-4 text-[#8a785d]" />
            <input
              aria-label="搜索任务"
              value={q.search}
              onChange={(e) => q.setSearch(e.target.value)}
              className={inputClass + ' max-w-48 pl-9'}
              placeholder="搜一张能接的委托…"
            />
          </div>
        </div>
      </div>
      {q.state.status === 'loading' ? (
        <Loading />
      ) : q.state.status === 'error' ? (
        <ErrorState message={q.state.message} retry={q.reload} />
      ) : q.filtered.length ? (
        <div className="guild-board grid gap-6 rounded-lg border-[3px] border-[#332820] p-5 pb-8 shadow-[5px_6px_0_#33282035] md:grid-cols-2 xl:grid-cols-3">
          {q.filtered.map(({ quest, steps, reward }) => {
            const done = steps.filter((s) => s.completedAt !== null).length
            return (
              <Link
                key={quest.id}
                to={`/quests/${quest.id}`}
                className="group guild-note relative block transition duration-200 before:absolute before:-top-2 before:left-1/2 before:z-10 before:size-4 before:rounded-full before:border-2 before:border-[#332820] before:bg-[#a94732] before:shadow-md"
              >
                <Card className="h-full transition group-hover:-translate-y-1 group-hover:border-[#8a785d] group-hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <Emblem
                      symbol={reward.symbol}
                      palette={reward.palette}
                      imageUrl={reward.imageUrl}
                    />
                    <span
                      className={
                        quest.status === 'completed'
                          ? 'guild-stamp px-3 py-2 text-xs font-black text-[#a94732]'
                          : 'rounded-sm border border-[#a38c65] px-2 py-1 text-xs text-[#665d3e]'
                      }
                    >
                      {statuses[quest.status]}
                    </span>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Pill>{categories[quest.category]}</Pill>
                    <span className="pt-1 text-[10px] text-[#8a785d]">
                      {tiers[quest.tier].label}
                    </span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold leading-7 text-[#665d3e]">
                    {quest.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#716449]">
                    {quest.description || '一步一步，完成自己的小目标。'}
                  </p>
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-[10px] text-[#716449]">
                      <span>冒险进度</span>
                      <span>
                        {done}/{steps.length} 步
                      </span>
                    </div>
                    <Progress value={(done / steps.length) * 100} />
                  </div>
                  <div className="mt-5 flex justify-between border-t border-[#eadcc1] pt-4 text-[10px] text-[#8a785d]">
                    <span>{dateLabel(quest.dueDate)}</span>
                    <span className="flex items-center gap-1">
                      继续看看
                      <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="这里还没有冒险"
          description="换个筛选条件，或把心里想做的那件事写下来。"
          action={
            <Link to="/quests/new">
              <Button variant="secondary">
                <ScrollText className="size-4" />让 AI 帮我规划
              </Button>
            </Link>
          }
        />
      )}
    </>
  )
}
