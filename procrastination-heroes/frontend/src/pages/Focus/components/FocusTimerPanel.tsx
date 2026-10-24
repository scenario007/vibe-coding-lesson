import { Button, Card, Loading, Pill, inputClass } from '@/components/ui'
import { Leaf, Pause, Play, Square } from 'lucide-react'
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
  return (
    <Card className="overflow-hidden bg-[#f2f5e8] p-7 sm:p-10">
      <div className="flex justify-center">
        <Pill>
          <Leaf className="size-3" />
          {f.running
            ? '正在悄悄向前'
            : f.session?.status === 'paused'
              ? '休息一下，时间已暂停'
              : '留一点时间，给自己'}
        </Pill>
      </div>
      <div
        className="relative mx-auto my-8 grid aspect-square w-full max-w-[310px] place-items-center rounded-full border-[12px] border-[#e0e8d1] bg-[#f8faef] shadow-[inset_0_0_0_1px_#d5dfc4]"
        style={{
          background: `conic-gradient(#95b77b ${(f.elapsed / (f.session?.targetSeconds || f.minutes * 60)) * 360}deg, #f8faef 0deg)`,
        }}
      >
        <div className="absolute inset-2 rounded-full bg-[#f8faef]" />
        <div className="relative text-center">
          <Leaf className="mx-auto mb-5 size-8 text-[#abc296]" />
          <p className="font-serif text-6xl font-medium tabular-nums tracking-wide text-[#537043]">
            {min}
            <span className="mx-1 text-[#b4c4a1]">:</span>
            {sec}
          </p>
          <p className="mt-4 text-[10px] tracking-[.18em] text-[#9faf8b]">
            JUST THIS LITTLE MOMENT
          </p>
        </div>
      </div>
      <div className="mb-5 flex justify-center gap-2">
        {[10, 25, 45].map((m) => (
          <button
            key={m}
            disabled={f.ongoing}
            onClick={() => f.setMinutes(m)}
            className={`rounded-full px-4 py-2 text-xs ${(f.ongoing ? f.session?.targetSeconds === m * 60 : f.minutes === m) ? 'bg-[#dee9cd] text-[#6a8a50]' : 'text-[#a0af8d] hover:bg-white'}`}
          >
            {m} 分钟
          </button>
        ))}
      </div>
      <label className="mx-auto mb-5 grid max-w-md gap-2 text-xs text-[#8b9c77]">
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
      <div className="flex justify-center gap-3">
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
      <p className="mt-6 text-center text-[10px] leading-6 text-[#a4b191]">
        刷新页面会恢复计时，切换标签后时间继续。
        <br />
        暂停时间不计入，任务进度由你完成后亲自确认。
      </p>
    </Card>
  )
}
