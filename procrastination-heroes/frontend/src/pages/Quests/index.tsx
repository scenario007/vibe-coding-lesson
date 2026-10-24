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
        title="任务大厅"
        description="把大大的愿望，拆成一步一步可以抵达的地方。"
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
        <div className="flex gap-1 rounded-xl border border-[#e4e6da] bg-[#f0f1e7] p-1">
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
              className={`rounded-lg px-3 py-2 text-xs ${q.filter === v ? 'bg-white font-medium text-[#45653f] shadow-sm' : 'text-[#97a18a]'}`}
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
            <Search className="absolute left-3 top-3.5 size-4 text-[#a6ad9a]" />
            <input
              aria-label="搜索任务"
              value={q.search}
              onChange={(e) => q.setSearch(e.target.value)}
              className={inputClass + ' max-w-48 pl-9'}
              placeholder="寻找一场冒险…"
            />
          </div>
        </div>
      </div>
      {q.state.status === 'loading' ? (
        <Loading />
      ) : q.state.status === 'error' ? (
        <ErrorState message={q.state.message} retry={q.reload} />
      ) : q.filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {q.filtered.map(({ quest, steps, reward }) => {
            const done = steps.filter((s) => s.completedAt !== null).length
            return (
              <Link key={quest.id} to={`/quests/${quest.id}`} className="group">
                <Card className="h-full transition group-hover:-translate-y-1 group-hover:border-[#b8c8a3] group-hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <Emblem symbol={reward.symbol} palette={reward.palette} />
                    <Pill tone={quest.status === 'completed' ? 'gold' : 'sage'}>
                      {statuses[quest.status]}
                    </Pill>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Pill>{categories[quest.category]}</Pill>
                    <span className="pt-1 text-[10px] text-[#a3ac96]">
                      {tiers[quest.tier].label}
                    </span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold leading-7 text-[#46603b]">
                    {quest.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#98a28b]">
                    {quest.description || '一步一步，完成自己的小目标。'}
                  </p>
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-[10px] text-[#90a17b]">
                      <span>冒险进度</span>
                      <span>
                        {done}/{steps.length} 步
                      </span>
                    </div>
                    <Progress value={(done / steps.length) * 100} />
                  </div>
                  <div className="mt-5 flex justify-between border-t border-[#edf0e6] pt-4 text-[10px] text-[#a3ac96]">
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
