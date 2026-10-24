import { Button, Card, EmptyState } from '@/components/ui'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import { ArrowRight, ChevronRight, Flag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { QuestPreview } from './QuestPreview'
export function ActiveAdventures({
  active,
  draft,
}: {
  active: QuestDetail[]
  draft: QuestDetail[]
}) {
  return (
    <Card>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Flag className="size-4 text-[#839c6c]" />
          正在进行的冒险{' '}
          <span className="text-[10px] font-normal text-[#a7b198]">{active.length} 项</span>
        </h2>
        <Link to="/quests" className="flex items-center gap-1 text-[10px] text-[#8a9c75]">
          全部任务
          <ChevronRight className="size-3" />
        </Link>
      </div>
      {active.length ? (
        <div className="space-y-3">
          {active.slice(0, 3).map((q) => (
            <QuestPreview key={q.quest.id} detail={q} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={draft.length ? '你的计划准备好了' : '冒险故事，等你落笔'}
          description={
            draft.length
              ? '草案还没有开始，确认关卡与奖励后，就可以出发。'
              : '先说说你想完成什么，让 AI 帮你找到今天能做的第一步。'
          }
          action={
            <Link to={draft.length ? `/quests/${draft[0].quest.id}` : '/quests/new'}>
              <Button variant="secondary">
                {draft.length ? '查看任务草稿' : '创建第一个任务'}
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          }
        />
      )}
    </Card>
  )
}
