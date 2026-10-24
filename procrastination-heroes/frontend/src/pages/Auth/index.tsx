import { Button, ErrorState, Field } from '@/components/ui'
import { usePlayer } from '@/system/stores/player'
import { ArrowRight, Leaf, ShieldCheck, Sparkles } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
export default function Auth() {
  const form = useAuth()
  const { user } = usePlayer()
  if (user) return <Navigate to="/dashboard" replace />
  return (
    <main className="grid min-h-screen bg-[#f7f5ed] lg:grid-cols-[1.2fr_1fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#eaf0e2] lg:block">
        <img
          src="/assets/camp-landscape.png"
          alt="森林里的温暖小屋"
          className="absolute inset-0 h-full w-full object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 bg-linear-to-b from-[#f6f5e9]/90 via-transparent to-[#234b32]/20" />
        <div className="relative p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#2e5748] text-white">
              <Leaf />
            </span>
            <span className="font-serif text-xl font-bold text-[#2e5748]">拖延勇者协会</span>
          </div>
          <h1 className="mt-20 font-serif text-5xl font-bold leading-[1.5] tracking-wide text-[#2e5748]">
            你的冒险，
            <br />
            从一小步开始。
          </h1>
          <p className="mt-5 max-w-xs text-sm leading-8 text-[#6c8062]">
            让 AI 帮你把遥远的目标拆成今天的小事。
            <br />
            每一份努力，都会在这里慢慢发光。
          </p>
        </div>
        <div className="absolute bottom-10 left-14 rounded-2xl border border-white/50 bg-white/70 px-5 py-4 text-xs leading-6 text-[#58704c] backdrop-blur">
          🌱 不必一口气到终点。
          <br />
          <span className="text-[#87957a]">今天先动一下，已经很棒了。</span>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2 text-[#3f674a] lg:hidden">
            <Leaf />
            <span className="font-serif text-lg font-bold">拖延勇者协会</span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e8efde] px-3 py-1.5 text-[10px] font-medium tracking-widest text-[#738c5c]">
            <Sparkles className="size-3" />
            WELCOME, LITTLE HERO
          </span>
          <h2 className="mt-5 font-serif text-3xl font-bold text-[#304b37]">
            {form.register ? '领取你的勇者身份' : '欢迎回到协会'}
          </h2>
          <p className="mt-3 text-sm text-[#929c85]">
            {form.register
              ? '为自己留一间小屋，记录每一次前进。'
              : '小屋里的灯还亮着，继续你的冒险吧。'}
          </p>
          <div className="my-7 grid grid-cols-2 rounded-xl bg-[#eeeee4] p-1">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                onClick={() => form.setRegister(v)}
                className={`rounded-lg py-2.5 text-sm transition ${form.register === v ? 'bg-white font-medium text-[#38583b] shadow-sm' : 'text-[#929b87]'}`}
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
          <div className="mt-8 flex justify-center gap-2 text-[10px] text-[#a4ad97]">
            <ShieldCheck className="size-3.5" />
            你的任务与小屋，只属于你
          </div>
        </div>
      </section>
    </main>
  )
}
