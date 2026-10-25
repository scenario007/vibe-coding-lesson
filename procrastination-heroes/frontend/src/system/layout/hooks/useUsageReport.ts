import { GetUsageReportAPI } from '@/apis/ai/GetUsageReportAPI'
import type { UsageReport } from '@/objects/ai/apiTypes/UsageReport'
import { useEffect, useState } from 'react'
type UsageState =
  | { status: 'loading' }
  | { status: 'ready'; data: UsageReport }
  | { status: 'error'; message: string }
export function useUsageReport() {
  const [state, setState] = useState<UsageState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    let pending = false
    async function poll() {
      if (pending) return
      pending = true
      try {
        const data = await new GetUsageReportAPI().send()
        if (active) setState({ status: 'ready', data })
      } catch (e) {
        if (active)
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : '用量账本读取失败',
          })
      } finally {
        pending = false
      }
    }
    void poll()
    const timer = setInterval(() => void poll(), 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [revision])
  return { state, reload: () => setRevision((v) => v + 1) }
}
