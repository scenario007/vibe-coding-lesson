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
import { useQuests } from './hooks/useQuests'
export default function Quests() {
  const q = useQuests()
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
                    <Emblem symbol={reward.symbol} palette={reward.palette} />
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
