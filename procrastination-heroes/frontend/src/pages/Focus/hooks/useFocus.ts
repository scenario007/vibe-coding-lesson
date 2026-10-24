import { AbandonFocusAPI } from '@/apis/focus/AbandonFocusAPI'
import { FinishFocusAPI } from '@/apis/focus/FinishFocusAPI'
import { GetCurrentFocusAPI } from '@/apis/focus/GetCurrentFocusAPI'
import { ListFocusHistoryAPI } from '@/apis/focus/ListFocusHistoryAPI'
import { PauseFocusAPI } from '@/apis/focus/PauseFocusAPI'
import { ResumeFocusAPI } from '@/apis/focus/ResumeFocusAPI'
import { StartFocusAPI } from '@/apis/focus/StartFocusAPI'
import { ListQuestsAPI } from '@/apis/quests/ListQuestsAPI'
import type { FocusResponse } from '@/objects/focus/apiTypes/FocusResponse'
import { useResource } from '@/system/hooks/useResource'
import { touchPlayer, usePlayer } from '@/system/stores/player'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
export function useFocus() {
  const { user } = usePlayer()
  const [search] = useSearchParams()
  const [stepId, setStepId] = useState(search.get('step') || '')
  const [minutes, setMinutes] = useState(user?.focusMinutes || 25)
  const [response, setResponse] = useState<FocusResponse | null>(null)
  const [now, setNow] = useState(Date.now())
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const quests = useResource(() => new ListQuestsAPI().send())
  const history = useResource(() => new ListFocusHistoryAPI().send())
  useEffect(() => {
    let active = true
    async function poll() {
      try {
        const v = await new GetCurrentFocusAPI().send()
        if (active) {
          setResponse(v)
          setOffset(v.serverNow - Date.now())
          setError('')
          if (v.session?.status === 'completed') {
            setNotice('这一段专注已记录。回到任务，看看推进了哪一步。')
            history.reload()
            touchPlayer()
          }
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : '读取计时未完成')
      }
    }
    void poll()
    const id = setInterval(() => void poll(), 5000)
    const tick = setInterval(() => setNow(Date.now()), 250)
    return () => {
      active = false
      clearInterval(id)
      clearInterval(tick)
    }
  }, [])
  const session = response?.session
  const running = session?.status === 'running'
  const ongoing = running || session?.status === 'paused'
  const elapsed =
    ongoing && session
      ? Math.min(
          session.targetSeconds,
          session.elapsedSeconds +
            (running && session.runningSince
              ? Math.max(0, Math.floor((now + offset - session.runningSince) / 1000))
              : 0),
        )
      : 0
  const remaining = Math.max(
    0,
    (ongoing && session ? session.targetSeconds : minutes * 60) - elapsed,
  )
  async function act(action: 'start' | 'pause' | 'resume' | 'finish' | 'abandon') {
    setBusy(true)
    setError('')
    try {
      const result = await (
        action === 'start'
          ? new StartFocusAPI(stepId || null, minutes)
          : action === 'pause'
            ? new PauseFocusAPI()
            : action === 'resume'
              ? new ResumeFocusAPI()
              : action === 'finish'
                ? new FinishFocusAPI()
                : new AbandonFocusAPI()
      ).send()
      setResponse(result)
      setOffset(result.serverNow - Date.now())
      setNotice(
        result.session?.status === 'abandoned'
          ? '这段时间也已记下。休息一下，再继续。'
          : result.session?.status === 'completed'
            ? '专注完成，别忘了回任务记录你的进展。'
            : '',
      )
      history.reload()
      touchPlayer()
    } catch (e) {
      setError(e instanceof Error ? e.message : '计时操作未完成')
    } finally {
      setBusy(false)
    }
  }
  const choices =
    quests.state.status === 'ready'
      ? quests.state.data
          .filter((q) => q.quest.status === 'active')
          .flatMap((q) =>
            q.steps
              .filter((s) => s.completedAt === null)
              .map((s) => ({
                id: s.id,
                label: q.quest.title + ' · ' + s.title,
                questId: q.quest.id,
              })),
          )
      : []
  return {
    stepId,
    setStepId,
    minutes,
    setMinutes,
    session,
    running,
    ongoing,
    remaining,
    elapsed,
    busy,
    error,
    notice,
    act,
    choices,
    history,
    loaded: response !== null,
  }
}
