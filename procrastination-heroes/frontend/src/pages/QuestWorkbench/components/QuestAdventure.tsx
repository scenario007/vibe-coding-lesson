import { ArchiveQuestAPI } from '@/apis/quests/ArchiveQuestAPI'
import { CompleteQuestStepAPI } from '@/apis/quests/CompleteQuestStepAPI'
import { RestoreQuestAPI } from '@/apis/quests/RestoreQuestAPI'
import { UpdateQuestNotesAPI } from '@/apis/quests/UpdateQuestNotesAPI'
import {
  Button,
  Card,
  Emblem,
  ErrorState,
  Field,
  inputClass,
  Pill,
  Progress,
} from '@/components/ui'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import { categories, dateLabel, statuses, tiers } from '@/pages/objects/labels'
import { setProgress, touchPlayer } from '@/system/stores/player'
import {
  Archive,
  ArrowRight,
  BookOpen,
  Check,
  Circle,
  CircleCheck,
  Coins,
  LockKeyhole,
  RotateCcw,
  Timer,
  Trophy,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
export function QuestAdventure({
  detail,
  onChanged,
}: {
  detail: QuestDetail
  onChanged: (q: QuestDetail) => void
}) {
  const { quest, steps, reward } = detail
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reflection, setReflection] = useState(quest.reflection)
  const [due, setDue] = useState(quest.dueDate || '')
  const done = steps.filter((v) => v.completedAt !== null).length
  async function complete(id: string) {
    setBusy(id)
    setError('')
    try {
      const result = await new CompleteQuestStepAPI(quest.id, id).send()
      onChanged(result.detail)
      setProgress(result.progress)
      touchPlayer()
      setNotice(
        result.alreadyCompleted
          ? '这一步此前已记录，没有重复结算。'
          : result.awardedCoins
            ? `这一小步，算数。+${result.awardedCoins * 2} XP · +${result.awardedCoins} 冒险币${result.rewardUnlocked ? '，专属纪念物已解锁！' : ''}`
            : '进展已记录，今日奖励额度已用完。' +
              (result.rewardUnlocked ? '专属纪念物仍已解锁！' : ''),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作未完成')
    } finally {
      setBusy('')
    }
  }
  async function archive(restore: boolean) {
    setBusy('archive')
    setError('')
    try {
      onChanged(
        await (restore ? new RestoreQuestAPI(quest.id) : new ArchiveQuestAPI(quest.id)).send(),
      )
      touchPlayer()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作未完成')
    } finally {
      setBusy('')
    }
  }
  async function saveNotes() {
    setBusy('notes')
    setError('')
    try {
      onChanged(await new UpdateQuestNotesAPI(quest.id, reflection, due || null).send())
      setNotice('复盘和日期已经记下，进度会一直保留。')
      touchPlayer()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存未完成')
    } finally {
      setBusy('')
    }
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.8fr_1fr]">
      <div className="space-y-5">
        {notice && (
          <div
            role="status"
            className="rounded-xl border border-[#cfdfbc] bg-[#eff6e7] p-4 text-xs leading-6 text-[#76965c]"
          >
            {notice}
          </div>
        )}
        {error && <ErrorState message={error} />}
        <Card className="bg-[#f1f4e8]">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Pill>{categories[quest.category]}</Pill>
            <Pill tone="gold">{tiers[quest.tier].label}</Pill>
            <Pill>{statuses[quest.status]}</Pill>
            <span className="ml-auto text-[10px] text-[#9aaa87]">{dateLabel(quest.dueDate)}</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-7 text-[#7f906e]">
            {quest.description}
          </p>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-[#7f9468]">
              <span>
                {quest.status === 'completed' ? '这场冒险，已经完成' : '一步一步，向终点靠近'}
              </span>
              <span>
                {done} / {steps.length}
              </span>
            </div>
            <Progress value={(done / steps.length) * 100} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-5 text-sm font-semibold">你的冒险关卡</h2>
          <div className="space-y-4">
            {steps.map((step, index) => {
              const completed = step.completedAt !== null
              const locked = step.dependsOn.some(
                (v) => !steps.find((s) => s.position === v)?.completedAt,
              )
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border p-5 ${completed ? 'border-[#dce8d0] bg-[#f5f9ef]' : 'border-[#e7e9df] bg-white'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 ${completed ? 'text-[#81a265]' : 'text-[#b5c1a3]'}`}>
                      {completed ? (
                        <CircleCheck className="size-5" />
                      ) : locked ? (
                        <LockKeyhole className="size-5" />
                      ) : (
                        <Circle className="size-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[9px] tracking-widest text-[#a2b08f]">
                        STAGE {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3
                        className={`text-sm font-semibold ${completed ? 'text-[#8da277]' : 'text-[#4a6640]'}`}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-2 text-xs leading-6 text-[#8f9e80]">{step.description}</p>
                      {step.checklist.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {step.checklist.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-[11px] leading-5 text-[#97a388]"
                            >
                              <Check className="size-3 shrink-0 text-[#b4c4a0]" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-3 rounded-lg bg-[#f1f4e9] px-3 py-2 text-[10px] leading-5 text-[#899d71]">
                        完成标准：{step.criterion}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1 text-[10px] text-[#a5b095]">
                          <Timer className="size-3" />约 {step.minutes} 分钟
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[#b49a63]">
                          <Coins className="size-3" />
                          {step.coins} 币 · {step.coins * 2} XP
                        </span>
                        {!completed && quest.status === 'active' && (
                          <div className="ml-auto flex gap-2">
                            <Link to={`/focus?step=${step.id}`}>
                              <Button
                                variant="secondary"
                                className="min-h-8 px-3 py-1.5 text-[10px]"
                                disabled={locked}
                              >
                                专注这一小步
                              </Button>
                            </Link>
                            <Button
                              className="min-h-8 px-3 py-1.5 text-[10px]"
                              disabled={!!busy || locked}
                              onClick={() => void complete(step.id)}
                            >
                              {busy === step.id ? '记录中…' : '确认完成'}
                            </Button>
                          </div>
                        )}
                        {completed && (
                          <span className="ml-auto text-[10px] text-[#8ca374]">
                            已完成 · {new Date(step.completedAt!).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </div>
                      {locked && !completed && (
                        <p className="mt-2 text-[9px] text-[#b1b99f]">
                          先完成前面的关卡，再继续这里。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="size-4 text-[#9aab83]" />
            冒险随笔
          </h2>
          <textarea
            className={inputClass + ' min-h-28'}
            value={reflection}
            maxLength={3000}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="有什么比想象中容易？哪一步还可以更小？留句话给下次的自己。"
          />
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <Field
              label="重新安排截止日期"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            <Button variant="secondary" disabled={!!busy} onClick={() => void saveNotes()}>
              保存随笔与日期
            </Button>
          </div>
        </Card>
      </div>
      <div className="space-y-5 xl:sticky xl:top-24">
        <Card className="bg-[#f5f1e4]">
          <div className="flex justify-between text-xs font-semibold text-[#a59468]">
            <span>这场冒险的专属纪念物</span>
            {quest.completedAt ? <Trophy className="size-4" /> : <LockKeyhole className="size-4" />}
          </div>
          <div className={`my-7 flex justify-center ${quest.completedAt ? '' : 'opacity-65'}`}>
            <Emblem symbol={reward.symbol} palette={reward.palette} size="large" />
          </div>
          <h3 className="text-center font-serif text-xl font-bold text-[#7e7756]">{reward.name}</h3>
          <p className="mt-3 text-center text-xs leading-7 text-[#a59d82]">{reward.story}</p>
          <p className="mt-4 text-center text-[9px] text-[#b4ac92]">
            任务定制 · 模板呈现 · {quest.completedAt ? '已收入你的纪念图鉴' : '完成全部阶段后解锁'}
          </p>
          {quest.completedAt && (
            <Link to="/base" className="mt-5 block">
              <Button className="w-full" variant="secondary">
                把它放进我的小屋
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          )}
        </Card>
        <Card>
          <p className="text-xs leading-7 text-[#99a789]">
            {quest.status === 'archived'
              ? '暂时放下也没关系，已经走过的路会一直保留。'
              : '任务可以改期，进度已经留下。按自己的节奏，慢慢来。'}
          </p>
          <Button
            className="mt-4 w-full"
            variant="ghost"
            disabled={!!busy}
            onClick={() => void archive(quest.status === 'archived')}
          >
            {quest.status === 'archived' ? (
              <RotateCcw className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
            {quest.status === 'archived' ? '恢复这场冒险' : '暂时归档'}
          </Button>
        </Card>
      </div>
    </div>
  )
}
