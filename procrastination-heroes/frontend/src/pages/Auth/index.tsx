import { Button, ErrorState, Field } from '@/components/ui'
import { AtlasSprite } from '@/components/ui/AtlasSprite'
import { usePlayer } from '@/system/stores/player'
import { ArrowRight, ShieldCheck, Swords } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

export default function Auth() {
  const form = useAuth()
  const { user } = usePlayer()
  if (user) return <Navigate to="/dashboard" replace />
  return (
    <main className="grid min-h-screen bg-[#eee0bd] text-[#332820] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden border-r-2 border-[#332820] bg-[#ead6a7] p-10 lg:flex lg:flex-col xl:p-14">
        <div className="flex items-center gap-3">
          <span className="grid size-11 -rotate-6 place-items-center rounded-[5px_10px_5px_8px] border-2 border-[#332820] bg-[#a94732] text-[#fff8e7] shadow-[3px_3px_0_#332820]">
            <Swords className="size-6" />
          </span>
          <div>
            <p className="font-serif text-xl font-black">拖延勇者协会</p>
            <p className="mt-1 text-[9px] font-bold tracking-[.2em] text-[#74614c]">
              THE NOT-SO-LEGENDARY GUILD
            </p>
          </div>
        </div>
        <div className="relative mt-16">
          <span className="inline-block -rotate-3 border border-[#a94732] px-3 py-1 text-xs font-bold text-[#a94732]">
            公会常年招募中
          </span>
          <h1 className="mt-6 font-serif text-4xl font-black leading-[1.5] xl:text-5xl">
            废柴勇者，
            <br />
            欢迎归队。
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-8 text-[#74614c]">
            这里没有天选之人。
            <br />
            只有把“明天再说”，改成“今天先动一下”的普通人。
          </p>
        </div>
        <div className="relative mx-auto mt-8 w-full max-w-[440px]">
          <span className="absolute right-0 top-1 -rotate-3 rounded-[50%] border border-[#332820] bg-[#fff8e7] px-4 py-2 text-xs text-[#626341]">
            入会申请……我先看看。
          </span>
          <AtlasSprite
            sheet="hero"
            frame={5}
            label="披着皱披风，抱着卷轴认真阅读的锅盖盾牌勇者"
            className="w-full"
          />
        </div>
        <p className="mt-auto border-t-2 border-dashed border-[#b69b6d] pt-5 text-[11px] leading-7 text-[#74614c]">
          入会条件只有一条：愿意开始。
          <br />
          <span className="text-[#a94732]">装备凑合一点，人生也能往前走。</span>
        </p>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:py-16">
        <div className="relative w-full max-w-[440px] rounded-[5px_14px_7px_12px] border-2 border-[#332820] bg-[#fff8e7] px-6 py-8 shadow-[6px_7px_0_#332820] sm:px-9 sm:py-10">
          <span
            aria-hidden="true"
            className="absolute -top-3 left-[38%] h-6 w-24 -rotate-3 border border-[#bcac7d]/40 bg-[#d6c69d]/85"
          />
          <div className="mb-7 flex items-center gap-2 text-[#a94732] lg:hidden">
            <Swords className="size-5" />
            <span className="font-serif text-lg font-black">拖延勇者协会</span>
          </div>
          <div className="flex items-center justify-between border-b-2 border-dashed border-[#d3be94] pb-4 text-[10px] font-bold tracking-[.15em] text-[#8b775c]">
            <span>公会入会处 / ENTRY FORM</span>
            <ShieldCheck className="size-5 text-[#a94732]" />
          </div>
          <AtlasSprite
            sheet="hero"
            frame={5}
            label="抱着卷轴阅读入会申请的锅盖勇者"
            className="mx-auto mt-4 w-36 lg:hidden"
          />
          <h2 className="mt-6 font-serif text-3xl font-black text-[#332820]">
            {form.register ? '领取你的勇者身份' : '老会员，回来签个到。'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#8b775c]">
            {form.register ? '填好这张表，公会就有你的一席之地。' : '小屋和冒险存档，都替你留着。'}
          </p>
          <div className="my-7 grid grid-cols-2 gap-1 border border-[#c7af83] bg-[#ebdebd] p-1">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                onClick={() => form.setRegister(v)}
                className={`min-h-10 px-2 py-2.5 text-sm transition ${form.register === v ? '-rotate-1 border border-[#332820] bg-[#fff8e7] font-bold text-[#a94732] shadow-[2px_2px_0_#332820]' : 'border border-transparent text-[#8b775c]'}`}
              >
                {v ? '注册账号' : '登录协会'}
              </button>
            ))}
          </div>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              void form.submit()
            }}
          >
            {form.register && (
              <Field
                label="勇者昵称"
                value={form.nickname}
                onChange={(e) => form.setNickname(e.target.value)}
                maxLength={24}
                placeholder="希望大家怎么称呼你？"
                required
              />
            )}
            <Field
              label="账号"
              value={form.username}
              onChange={(e) => form.setUsername(e.target.value)}
              placeholder="英文、数字或下划线，3–30 位"
              autoComplete="username"
              required
              minLength={3}
              maxLength={30}
            />
            <Field
              label="密码"
              type="password"
              value={form.password}
              onChange={(e) => form.setPassword(e.target.value)}
              placeholder="至少 8 位，给你的存档加把锁"
              minLength={8}
              maxLength={128}
              autoComplete={form.register ? 'new-password' : 'current-password'}
              required
            />
            {form.error && <ErrorState message={form.error} />}
            <Button className="mt-2 w-full" type="submit" disabled={form.busy}>
              {form.busy ? '正在准备冒险…' : form.register ? '创建我的勇者身份' : '继续我的冒险'}
              <ArrowRight className="size-4" />
            </Button>
          </form>
          <div className="mt-7 flex justify-center gap-2 border-t border-dashed border-[#d3be94] pt-5 text-[10px] text-[#8b775c]">
            <ShieldCheck className="size-3.5" />
            你的任务与小屋，只属于你
          </div>
        </div>
      </section>
    </main>
  )
}
