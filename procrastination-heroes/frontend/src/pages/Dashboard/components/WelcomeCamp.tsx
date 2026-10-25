import { AtlasSprite } from '@/components/ui/AtlasSprite'
import { ArrowRight, Pin, Plus, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function WelcomeCamp() {
  return (
    <section className="relative mb-7 overflow-hidden rounded-[5px_18px_7px_14px] border-2 border-[#332820] bg-[#fff8e7] p-6 shadow-[5px_6px_0_#332820] sm:p-8">
      <div aria-hidden="true" className="absolute inset-x-8 top-0 h-1 bg-[#c69a42]" />
      <div className="relative grid items-center gap-4 sm:grid-cols-[1fr_220px] xl:grid-cols-[1fr_290px]">
        <div className="relative z-10">
          <span className="mb-4 inline-flex -rotate-2 items-center gap-2 border border-[#332820] bg-[#e6d09c] px-3 py-1.5 text-[10px] font-bold tracking-[.15em] text-[#332820] shadow-[2px_2px_0_#332820]">
            <Pin className="size-3.5" /> 公会公告 · 第 001 号
          </span>
          <h2 className="font-serif text-[clamp(1.65rem,3vw,2.6rem)] font-black leading-[1.5] tracking-tight text-[#332820]">
            本公会不招天才。
            <br />
            <span className="relative text-[#a94732]">
              能开工就行。
              <span
                aria-hidden="true"
                className="absolute -bottom-1 left-0 h-1 w-full -rotate-1 bg-[#c69a42]/65"
              />
            </span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#74614c]">
            目标太大？交给 AI 拆成小委托。
            <br />
            你负责迈一步，公会负责记住这一步。
          </p>
          <Link
            to="/quests/new"
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-[4px_9px_5px_7px] border-2 border-[#332820] bg-[#a94732] px-5 py-3 text-sm font-bold text-[#fff8e7] shadow-[3px_3px_0_#332820] transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4"
          >
            <Plus className="size-4" /> 领取新的委托 <ArrowRight className="ml-1 size-4" />
          </Link>
          <p className="mt-4 text-[10px] text-[#8b775c]">* 迟到可以。今天先动一下。</p>
        </div>
        <div className="relative mx-auto w-full max-w-[290px] self-end sm:max-w-none">
          <span className="absolute right-1 top-0 z-10 grid size-[76px] rotate-12 place-content-center rounded-full border-[3px] border-double border-[#a94732] text-center text-[10px] font-bold leading-5 text-[#a94732]">
            <ShieldCheck className="mx-auto size-5" />
            正式勇者
          </span>
          <AtlasSprite
            sheet="hero"
            frame={2}
            label="披着皱披风、举起锅盖盾牌，终于准备开工的小勇者"
            className="relative mt-10 w-full"
          />
          <div className="mx-5 -rotate-2 border-t-2 border-dashed border-[#b9a582] pt-3 text-center text-[11px] font-medium text-[#626341]">
            装备可以凑合，开工得算数。
          </div>
        </div>
      </div>
    </section>
  )
}
