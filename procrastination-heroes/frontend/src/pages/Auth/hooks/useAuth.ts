import { LoginUserAPI } from '@/apis/users/LoginUserAPI'
import { RegisterUserAPI } from '@/apis/users/RegisterUserAPI'
import { setPlayer } from '@/system/stores/player'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
export function useAuth() {
  const [register, setRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [search] = useSearchParams()
  async function submit() {
    setBusy(true)
    setError('')
    try {
      const response = await (
        register
          ? new RegisterUserAPI(username, password, nickname)
          : new LoginUserAPI(username, password)
      ).send()
      setPlayer(response.user, response.token)
      const redirect = search.get('next')
      navigate(redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard', {
        replace: true,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录未完成')
    } finally {
      setBusy(false)
    }
  }
  return {
    register,
    setRegister,
    username,
    setUsername,
    password,
    setPassword,
    nickname,
    setNickname,
    busy,
    error,
    submit,
  }
}
