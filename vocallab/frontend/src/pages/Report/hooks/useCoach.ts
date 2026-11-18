import { useEffect, useRef, useState } from 'react'
import type { CoachView, ResearchResult, SongInfo } from '../../../apis/coach/contracts'
import { AnalyzeCoachAPI } from '../../../apis/coach/AnalyzeCoachAPI'
import { AskCoachAPI } from '../../../apis/coach/AskCoachAPI'
import { EditDifficultyAPI } from '../../../apis/coach/EditDifficultyAPI'
import { GetCoachAPI } from '../../../apis/coach/GetCoachAPI'
import { LookupCoachSourcesAPI } from '../../../apis/coach/LookupCoachSourcesAPI'
import { SetCoachKeyAPI } from '../../../apis/coach/SetCoachKeyAPI'
import type { Report } from '../../../apis/analysis/contracts'

type Operation = 'local' | 'deep' | 'edit' | 'ask' | 'recheck' | 'settings' | 'lookup'

export function useCoach(report: Report) {
  const id = report.analysisId
  const alignment = JSON.stringify([report.alignment.timeMapping, report.alignment.offsetSeconds,
    report.alignment.method, report.alignment.reliable, report.alignment.warnings])
  const [view, setView] = useState<CoachView | null>(null)
  const [loading, setLoading] = useState(true)
  const [operation, setOperation] = useState<Operation | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const alignmentRef = useRef(alignment)
  alignmentRef.current = alignment

  useEffect(() => {
    const controller = new AbortController()
    new GetCoachAPI(id).send(controller.signal).then(result => {
      if (!controller.signal.aborted) setView(result)
    }).catch((cause: Error) => {
      if (!controller.signal.aborted) setError(cause.message)
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [id, alignment, reload])

  async function run(kind: Operation, send: () => Promise<CoachView>) {
    if (operation) return false
    setOperation(kind)
    setError('')
    try {
      const result = await send()
      if (alignmentRef.current !== alignment) setReload(value => value + 1)
      else setView(result)
      return true
    } catch (cause) {
      setError((cause as Error).message)
      setReload(value => value + 1)
      return false
    } finally {
      setOperation(null)
    }
  }

  return {
    view, loading, operation, error,
    retry: () => { setLoading(true); setError(''); setReload(value => value + 1) },
    analyze: (song: SongInfo, deep: boolean, extraTools: string[], highThreshold: number | null, refresh: boolean) =>
      run(deep ? 'deep' : 'local', () => new AnalyzeCoachAPI(id, { song, deep, extraTools, highThreshold, refresh }).send()),
    recheck: (song: SongInfo) => run('recheck', () => new AnalyzeCoachAPI(id,
      { song, deep: false, extraTools: [], highThreshold: null, refresh: false, recheck: true }).send()),
    saveKey: (kind: 'ai' | 'search', key: string | null) =>
      run('settings', () => new SetCoachKeyAPI(id, kind, key).send()),
    lookup: async (song: SongInfo) => {
      let found: ResearchResult | null = null
      await run('lookup', async () => {
        found = await new LookupCoachSourcesAPI(id, song).send()
        return new GetCoachAPI(id).send()
      })
      return found as ResearchResult | null
    },
    edit: (input: ConstructorParameters<typeof EditDifficultyAPI>[1]) =>
      run('edit', () => new EditDifficultyAPI(id, input).send()),
    ask: (input: ConstructorParameters<typeof AskCoachAPI>[1]) =>
      run('ask', () => new AskCoachAPI(id, input).send()),
  }
}
