import type { DependencyList } from 'react'
import { useEffect, useState } from 'react'
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }
export function useResource<T>(load: () => Promise<T>, dependencies: DependencyList = []) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<Resource<T>>({ status: 'loading' })
  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    void load()
      .then((data) => {
        if (active) setState({ status: 'ready', data })
      })
      .catch((error) => {
        if (active)
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '加载没有完成',
          })
      })
    return () => {
      active = false
    }
  }, [...dependencies, revision])
  return { state, reload: () => setRevision((v) => v + 1), setState }
}
