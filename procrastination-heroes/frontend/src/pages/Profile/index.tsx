import { LogoutUserAPI } from '@/apis/users/LogoutUserAPI'
import { UpdateProfileAPI } from '@/apis/users/UpdateProfileAPI'
import { Button, Card, Emblem, ErrorState, Field, inputClass, PageTitle } from '@/components/ui'
import type { UserAvatar } from '@/objects/users/UserAvatar'
import { setPlayer, signOut, usePlayer } from '@/system/stores/player'
import { Check, Leaf, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
export default function Profile() {
  const { user } = usePlayer()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [avatar, setAvatar] = useState<UserAvatar>(user?.avatar || 'leaf')
  const [goal, setGoal] = useState(user?.dailyGoal || 3)
  const [minutes, setMinutes] = useState(user?.focusMinutes || 25)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function save() {
    setBusy(true)
    setError('')
    try {
      setPlayer(await new UpdateProfileAPI(nickname, avatar, goal, minutes).send())
      setNotice('勇者资料已保存。按喜欢的节奏，继续前进吧。')
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存未完成')
    } finally {
      setBusy(false)
    }
  }
  async function logout() {
    setBusy(true)
    try {
      await new LogoutUserAPI().send()
    } catch {
      /* Local sign-out is still available when disconnected. */
    } finally {
      signOut()
      navigate('/auth', { replace: true })
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="GUILD MEMBERSHIP CARD"
        title="我的公会证"
        description="持证上岗，允许迟疑，允许改期。"
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.7fr]">
        <Card className="bg-[#eadcc1] text-center">
          <div className="my-5 flex justify-center">
            <Emblem symbol={avatar} palette="sage" size="large" />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#716449]">{user?.nickname}</h2>
          <p className="mt-2 text-xs text-[#716449]">正在慢慢成长</p>
          <p className="mt-5 text-[10px] leading-7 text-[#8a785d]">
            加入协会于 {new Date(user?.createdAt || Date.now()).toLocaleDateString('zh-CN')}
            <br />
            账号：{user?.username}
          </p>
          <div className="mt-6 border-t border-[#cabb9e] pt-5 text-xs leading-7 text-[#716449]">
            “不必追赶别人，
            <br />
            你的步伐，有自己的方向。”
          </div>
        </Card>
        <div className="space-y-5">
          {error && <ErrorState message={error} />}{' '}
          {notice && (
            <p role="status" className="rounded-xl bg-[#eadcc1] p-4 text-xs text-[#716449]">
              {notice}
            </p>
          )}
          <Card>
            <h2 className="mb-5 text-sm font-semibold">我的模样</h2>
            <Field
              label="勇者昵称"
              value={nickname}
              maxLength={24}
              onChange={(e) => setNickname(e.target.value)}
            />
            <p className="mb-3 mt-5 text-xs text-[#716449]">选择一个喜欢的头像</p>
            <div className="flex flex-wrap gap-3">
              {(['leaf', 'star', 'moon', 'flower', 'book', 'mountain'] as const).map((v) => (
                <button
                  key={v}
                  aria-label={`选择${v}头像`}
                  onClick={() => setAvatar(v)}
                  className={`rounded-2xl p-1.5 ${avatar === v ? 'bg-[#eadcc1] ring-2 ring-[#8a785d]' : 'hover:bg-[#eadcc1]'}`}
                >
                  <Emblem symbol={v} palette="sage" size="small" />
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold">
              <Leaf className="size-4 text-[#716449]" />
              我的节奏
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="每天想推进几个小步骤？"
                type="number"
                min={1}
                max={20}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
              />
              <label className="grid gap-2 text-sm font-medium text-[#665d3e]">
                默认专注时间
                <select
                  className={inputClass}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                >
                  {[10, 25, 45].map((v) => (
                    <option key={v} value={v}>
                      {v} 分钟
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-4 text-[10px] leading-6 text-[#8a785d]">
              每日目标是一份温柔的提醒，按自己的节奏就好。
            </p>
            <Button className="mt-5" disabled={busy} onClick={() => void save()}>
              <Check className="size-4" />
              {busy ? '保存中…' : '保存勇者资料'}
            </Button>
          </Card>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">暂时离开协会</h2>
                <p className="mt-2 text-[10px] text-[#8a785d]">
                  任务与纪念物已经保存，下次登录继续。
                </p>
              </div>
              <Button variant="ghost" disabled={busy} onClick={() => void logout()}>
                <LogOut className="size-4" />
                退出登录
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
