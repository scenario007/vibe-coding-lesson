import { GetGenerationJobAPI } from '@/apis/ai/GetGenerationJobAPI'
import { ListGenerationJobsAPI } from '@/apis/ai/ListGenerationJobsAPI'
import { RequestPlanGenerationAPI } from '@/apis/ai/RequestPlanGenerationAPI'
import { CreateQuestDraftAPI } from '@/apis/quests/CreateQuestDraftAPI'
import { SaveQuestDraftAPI } from '@/apis/quests/SaveQuestDraftAPI'
import { StartQuestAPI } from '@/apis/quests/StartQuestAPI'
import type { RewardDraft } from '@/objects/economy/RewardDraft'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import type { QuestCategory } from '@/objects/quests/QuestCategory'
import type { RewardTier } from '@/objects/quests/RewardTier'
import type { StageDraft } from '@/objects/quests/StageDraft'
import type { MapMode } from '@/objects/quests/MapMode'
import { mapModes } from '@/objects/quests/MapMode'
import { touchPlayer } from '@/system/stores/player'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
const blankStage = (): StageDraft => ({
  title: '',
  description: '',
  checklist: [],
  minutes: 25,
  criterion: '',
  dependsOn: [],
})
export function useQuestEditor(initial: QuestDetail | null, onSaved: (q: QuestDetail) => void) {
  const navigate = useNavigate()
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const [title, setTitle] = useState(initial?.quest.title || '')
  const [category, setCategory] = useState<QuestCategory>(initial?.quest.category || 'study')
  const [description, setDescription] = useState(initial?.quest.description || '')
  const [dueDate, setDueDate] = useState(initial?.quest.dueDate || '')
  const [dailyMinutes, setDailyMinutes] = useState<number | null>(null)
  const [preference, setPreference] = useState('公会手账')
  const [feedback, setFeedback] = useState('')
  const [mapMode, setMapMode] = useState<MapMode>(() => {
    const saved = window.localStorage.getItem('guild-map-mode') as MapMode | null
    return saved && saved in mapModes ? saved : 'progress'
  })
  useEffect(() => {
    window.localStorage.setItem('guild-map-mode', mapMode)
  }, [mapMode])
  const [tier, setTier] = useState<RewardTier>(initial?.quest.tier || 'daily')
  const [stages, setStages] = useState<StageDraft[]>(
    initial?.steps.map((x) => ({
      title: x.title,
      description: x.description,
      checklist: x.checklist,
      minutes: x.minutes,
      criterion: x.criterion,
      dependsOn: x.dependsOn,
    })) || [],
  )
  const [reward, setReward] = useState<RewardDraft>(
    initial
      ? {
          name: initial.reward.name,
          story: initial.reward.story,
          symbol: initial.reward.symbol,
          palette: initial.reward.palette,
        }
      : {
          name: '这一小步，算数',
          story: '纪念你把一个想法，变成了今天的行动。',
          symbol: 'star',
          palette: 'sage',
        },
  )
  const [jobId, setJobId] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  function updateStage(index: number, patch: Partial<StageDraft>) {
    setStages((x) => x.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }
  function removeStage(index: number) {
    setStages((x) =>
      x.filter((_, i) => i !== index).map((v, i) => ({ ...v, dependsOn: i ? [i - 1] : [] })),
    )
  }
  function moveStage(index: number, delta: number) {
    setStages((x) => {
      const a = [...x]
      const j = index + delta
      if (j < 0 || j >= a.length) return x
      ;[a[index], a[j]] = [a[j], a[index]]
      return a.map((v, i) => ({ ...v, dependsOn: i ? [i - 1] : [] }))
    })
  }
  async function generate(rewardOnly = false) {
    if (title.trim().length < 2) {
      setError('先写下你想完成的事情，至少两个字。')
      return
    }
    setBusy(rewardOnly ? '正在设计专属奖励…' : 'AI 正在把目标拆成小步骤…')
    setError('')
    setNotice('')
    try {
      const job = await new RequestPlanGenerationAPI(
        title,
        dueDate || null,
        dailyMinutes,
        preference,
        (rewardOnly ? '保留目标，为它重新设计一份纪念奖励。 ' : '') + feedback,
        crypto.randomUUID(),
      ).send()
      for (let i = 0; i < 120; i++) {
        if (!alive.current) return
        await new Promise((r) => setTimeout(r, 1000))
        const current = await new GetGenerationJobAPI(job.id).send()
        if (!alive.current) return
        if (current.status === 'failed')
          throw new Error(current.error || '生成未完成，目标已经保留，可以重试。')
        if (current.status === 'succeeded' && current.result) {
          const plan = current.result
          if (!rewardOnly) {
            setTitle(plan.title)
            setDescription(plan.summary)
            setCategory(plan.category)
            setStages(plan.stages)
            setJobId(job.id)
          }
          setReward(plan.reward)
          setNotice(
            rewardOnly
              ? '新的奖励设计已准备好，可以继续修改。'
              : '计划已生成。看看步骤是否合适，再确认开始冒险。',
          )
          return
        }
      }
      throw new Error('这次等待稍久，你的输入已保留，可以稍后重试。')
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      if (alive.current) setBusy('')
    }
  }
  async function recover() {
    setBusy('正在找回上次的 AI 草案…')
    setError('')
    try {
      const jobs = await new ListGenerationJobsAPI().send()
      const job = jobs.find((j) => j.result)
      if (!job || !job.result) {
        setNotice('还没有已生成的草案，写下目标，让 AI 帮你规划吧。')
        return
      }
      setTitle(job.result.title)
      setCategory(job.result.category)
      setDescription(job.result.summary)
      setStages(job.result.stages)
      setReward(job.result.reward)
      setDueDate(job.dueDate || '')
      setDailyMinutes(job.dailyMinutes)
      setPreference(job.preference)
      setFeedback(job.feedback)
      setJobId(job.id)
      setNotice('已找回最近一次 AI 草案。确认内容后再开始，已有正式任务不会被修改。')
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取草案未完成')
    } finally {
      if (alive.current) setBusy('')
    }
  }
  async function save(start: boolean) {
    if (!stages.length) {
      setError('先让 AI 拆解，或手动添加至少一个步骤。')
      return
    }
    setBusy(start ? '正在确认冒险…' : '正在保存草稿…')
    setError('')
    try {
      const detail = initial
        ? await new SaveQuestDraftAPI(
            initial.quest.id,
            initial.quest.version,
            title,
            category,
            description,
            dueDate || null,
            tier,
            stages,
            reward,
          ).send()
        : await new CreateQuestDraftAPI(
            title,
            category,
            description,
            dueDate || null,
            tier,
            stages,
            reward,
            jobId,
          ).send()
      const result = start ? await new StartQuestAPI(detail.quest.id).send() : detail
      onSaved(result)
      touchPlayer()
      navigate(`/quests/${result.quest.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存未完成')
    } finally {
      if (alive.current) setBusy('')
    }
  }
  return {
    title,
    setTitle,
    category,
    setCategory,
    description,
    setDescription,
    dueDate,
    setDueDate,
    dailyMinutes,
    setDailyMinutes,
    preference,
    setPreference,
    feedback,
    setFeedback,
    mapMode,
    setMapMode,
    tier,
    setTier,
    stages,
    setStages,
    reward,
    setReward,
    busy,
    error,
    notice,
    generate,
    recover,
    save,
    updateStage,
    removeStage,
    moveStage,
    addStage: () =>
      setStages((x) => [...x, { ...blankStage(), dependsOn: x.length ? [x.length - 1] : [] }]),
  }
}
