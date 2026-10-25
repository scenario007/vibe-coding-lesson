import { Button, Card, Loading, Pill, inputClass } from '@/components/ui'
import { AtlasSprite } from '@/components/ui/AtlasSprite'
import { Pause, Play, ShieldCheck, Square } from 'lucide-react'
import { useFocus } from '../hooks/useFocus'

export function FocusTimerPanel({
  f,
  min,
  sec,
}: {
  f: ReturnType<typeof useFocus>
  min: string
  sec: string
}) {
  const paused = f.session?.status === 'paused'
  const completed = f.session?.status === 'completed'
  const resting = paused || f.session?.status === 'abandoned'
  const frame = f.running ? 1 : resting ? 2 : completed ? 3 : 0
  const targetSeconds = f.ongoing ? f.session?.targetSeconds || f.minutes * 60 : f.minutes * 60
  const progress = Math.min(100, Math.max(0, (f.elapsed / targetSeconds) * 100))
  const status = f.running
    ? '搭子正在努力保持清醒'
    : paused
      ? '休息回合 · 计时已暂停'
      : completed
        ? '本轮专注已记入公会日志'
        : '史莱姆搭子，报到！'
  return (
    <Card className="relative overflow-hidden bg-[#fff8e7] p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-[#d3be94] pb-4">
        <span className="text-[10px] font-bold tracking-[.18em] text-[#74614c]">
          专注作战室 / FOCUS CAMP
        </span>
        <ShieldCheck className="size-5 text-[#a94732]" />
      </div>
      <div className="mt-5 flex justify-center">
        <Pill>
          <span role="status">{status}</span>
        </Pill>
      </div>
      <div className="relative mx-auto grid max-w-md justify-items-center py-4">
        <span
          aria-hidden="true"
          className="absolute right-0 top-6 rotate-6 rounded-full border border-[#332820] bg-[#e9dab7] px-3 py-1 text-[10px] font-medium text-[#626341] sm:right-5"
        >
          {f.running
            ? '你专注，我放哨。'
            : paused
              ? '躺一会，不丢进度。'
              : completed
                ? '好耶，收工！'
                : '别看我困，我很靠谱。'}
        </span>
        <AtlasSprite
          sheet="slime"
          frame={frame}
          label={
            f.running
              ? '努力睁眼陪你专注的史莱姆'
              : resting
                ? '压扁身体休息的史莱姆'
                : completed
                  ? '弹起庆祝的史莱姆'
                  : '已经就位的困倦史莱姆'
          }
          className={`mt-7 w-40 origin-bottom sm:w-48 ${f.running ? 'motion-safe:animate-[slime-breathe_3s_ease-in-out_infinite]' : ''}`}
        />
        <p
          role="timer"
          aria-label={`剩余专注时间 ${min} 分 ${sec} 秒`}
          className="font-serif text-6xl font-black tabular-nums tracking-wide text-[#332820] sm:text-7xl"
        >
          {min}
          <span className="mx-1 text-[#a94732]">:</span>
          {sec}
        </p>
        <p className="mt-3 text-[10px] tracking-[.15em] text-[#8b775c]">
          眼前这一小步，就是今天的冒险。
        </p>
        <div
          role="progressbar"
          aria-label="本轮专注进度"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-5 h-3 w-full max-w-xs overflow-hidden rounded-sm border border-[#332820] bg-[#eadfc4]"
        >
          <div
            className="h-full bg-[#626341] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="mb-5 flex justify-center gap-2">
        {[10, 25, 45].map((m) => (
          <button
            key={m}
            disabled={f.ongoing}
            onClick={() => f.setMinutes(m)}
            className={`min-h-10 rounded-[3px_7px_4px_6px] border px-4 py-2 text-xs transition disabled:cursor-not-allowed ${(f.ongoing ? f.session?.targetSeconds === m * 60 : f.minutes === m) ? 'border-[#332820] bg-[#e6d09c] font-bold text-[#332820] shadow-[2px_2px_0_#332820]' : 'border-transparent text-[#8b775c] hover:border-[#c8b18c] hover:bg-[#fffdf4]'}`}
          >
            {m} 分钟
          </button>
        ))}
      </div>
      <label className="mx-auto mb-5 grid max-w-md gap-2 text-xs font-medium text-[#74614c]">
        这段时间，我想推进…
        <select
          className={inputClass}
          disabled={f.ongoing}
          value={f.ongoing ? f.session?.stepId || '' : f.stepId}
          onChange={(e) => f.setStepId(e.target.value)}
        >
          <option value="">自由专注 · 只记录这段时间</option>
          {f.choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap justify-center gap-3">
        {!f.loaded ? (
          <Loading label="读取计时…" />
        ) : !f.ongoing ? (
          <Button onClick={() => void f.act('start')} disabled={f.busy}>
            <Play className="size-4" />
            开始这一段专注
          </Button>
        ) : (
          <>
            <Button disabled={f.busy} onClick={() => void f.act(f.running ? 'pause' : 'resume')}>
              {f.running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {f.running ? '暂停一下' : '继续专注'}
            </Button>
            <Button
              variant="secondary"
              disabled={f.busy}
              onClick={() => void f.act(f.remaining === 0 ? 'finish' : 'abandon')}
            >
              <Square className="size-3.5" />
              {f.remaining === 0 ? '完成记录' : '结束并记录'}
            </Button>
          </>
        )}
      </div>
      <p className="mt-6 border-t border-dashed border-[#d3be94] pt-4 text-center text-[10px] leading-6 text-[#8b775c]">
        刷新页面会恢复计时，切换标签后时间继续。
        <br />
        暂停时间不计入，任务进度由你完成后亲自确认。
      </p>
    </Card>
  )
}
