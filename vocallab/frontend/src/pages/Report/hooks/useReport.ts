import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Job, Report } from '../../../apis/analysis/contracts'
import { AdjustAlignmentAPI } from '../../../apis/analysis/AdjustAlignmentAPI'
import { GetAnalysisAPI } from '../../../apis/analysis/GetAnalysisAPI'
import { GetAnalysisResultAPI } from '../../../apis/analysis/GetAnalysisResultAPI'

type View = { status: 'loading' } | { status: 'progress'; job: Job } |
  { status: 'failed'; job: Job } | { status: 'error'; message: string } |
  { status: 'ready'; report: Report }

export function useReport(id: string) {
  const [view, setView] = useState<View>({ status: 'loading' })
  const [adjusting, setAdjusting] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    setView({ status: 'loading' })
    setError('')
    const controller = new AbortController()
    let timer: number | undefined
    let failures = 0
    async function check() {
      try {
        const job = await new GetAnalysisAPI(id).send(controller.signal)
        if (controller.signal.aborted) return
        switch (job.status) {
          case 'pending':
          case 'processing':
            failures = 0
            setView({ status: 'progress', job })
            timer = window.setTimeout(() => void check(), 1000)
            break
          case 'failed':
            setView({ status: 'failed', job })
            break
          case 'completed': {
            const report = await new GetAnalysisResultAPI(id).send(controller.signal)
            if (!controller.signal.aborted) setView({ status: 'ready', report })
            break
          }
        }
      } catch (cause) {
        if (controller.signal.aborted) return
        if (++failures < 3) timer = window.setTimeout(() => void check(), 1200)
        else setView({ status: 'error', message: (cause as Error).message })
      }
    }
    void check()
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [id, refresh])

  async function adjust(offset: number | null) {
    setAdjusting(true)
    setError('')
    try {
      const job = await new AdjustAlignmentAPI(id, offset).send()
      navigate(`/analysis/${job.analysisId}`)
    } catch (e) { setError((e as Error).message) } finally { setAdjusting(false) }
  }

  return { view, adjusting, error, adjust, refresh: () => setRefresh(value => value + 1) }
}
