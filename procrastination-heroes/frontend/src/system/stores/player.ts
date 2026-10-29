import { GetPlayerProgressAPI } from '@/apis/economy/GetPlayerProgressAPI'
import { GetCurrentUserAPI } from '@/apis/users/GetCurrentUserAPI'
import type { PlayerProgress } from '@/objects/economy/PlayerProgress'
import type { UserProfile } from '@/objects/users/UserProfile'
import { APIError } from '@/system/api/apiRequest'
import { clearToken, getToken, saveToken } from '@/system/api/authToken'
import { create } from 'zustand'
const store = create<{
  user: UserProfile | null
  progress: PlayerProgress | null
  status: 'loading' | 'ready' | 'error'
  error: string
  revision: number
}>(() => ({ user: null, progress: null, status: 'loading', error: '', revision: 0 }))
export const usePlayer = () => store((s) => s)
export function setPlayer(user: UserProfile, token?: string) {
  if (token) saveToken(token)
  store.setState({ user, status: 'ready', error: '' })
}
export function setProgress(progress: PlayerProgress) {
  store.setState({ progress })
}
export function touchPlayer() {
  store.setState((s) => ({ revision: s.revision + 1 }))
  void refreshProgress()
}
export async function refreshProgress() {
  if (getToken()) {
    try {
      setProgress(await new GetPlayerProgressAPI().send())
    } catch {
      /* Pages retain their actionable errors. */
    }
  }
}
export function signOut() {
  clearToken()
  store.setState({ user: null, progress: null, status: 'ready', error: '' })
}
export async function bootPlayer() {
  if (!getToken()) {
    store.setState({ status: 'ready' })
    return
  }
  try {
    setPlayer(await new GetCurrentUserAPI().send())
    await refreshProgress()
  } catch (error) {
    if (error instanceof APIError && error.status === 401) signOut()
    else
      store.setState({
        status: 'error',
        error: error instanceof Error ? error.message : '加载失败',
      })
  }
}
