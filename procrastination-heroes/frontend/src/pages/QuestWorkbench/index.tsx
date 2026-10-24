import { GetQuestAPI } from '@/apis/quests/GetQuestAPI'
import { ErrorState, Loading, PageTitle } from '@/components/ui'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import { useResource } from '@/system/hooks/useResource'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { QuestAdventure } from './components/QuestAdventure'
import { QuestEditor } from './components/QuestEditor'
export default function QuestWorkbench() {
  const { id } = useParams()
  const { state, reload, setState } = useResource<QuestDetail | null>(
    () => (id ? new GetQuestAPI(id).send() : Promise.resolve(null)),
    [id],
  )
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorState message={state.message} retry={reload} />
  const detail = state.data
  const onSaved = (data: QuestDetail) => setState({ status: 'ready', data })
  return (
    <>
      <Link to="/quests" className="mb-5 inline-flex items-center gap-2 text-[11px] text-[#8b9c77]">
        <ArrowLeft className="size-3.5" />
        回到任务大厅
      </Link>
      <PageTitle
        eyebrow={detail ? 'YOUR ADVENTURE' : 'A NEW CHAPTER'}
        title={detail?.quest.title || '开启一场新的冒险'}
        description={
          detail?.quest.status === 'draft'
            ? '计划还是草稿，调整好关卡与奖励，再确认开始。'
            : detail
              ? '每一小步，都让你离终点近一点。'
              : '说说你的目标，让 AI 帮你找到第一小步。'
        }
      />
      {!detail || detail.quest.status === 'draft' ? (
        <QuestEditor
          key={detail ? detail.quest.id + '-' + detail.quest.version : 'new'}
          initial={detail}
          onSaved={onSaved}
        />
      ) : (
        <QuestAdventure key={detail.quest.id} detail={detail} onChanged={onSaved} />
      )}
    </>
  )
}
