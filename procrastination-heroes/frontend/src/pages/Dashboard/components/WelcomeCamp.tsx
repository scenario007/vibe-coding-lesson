import { Button } from '@/components/ui'
import { ArrowRight, Leaf, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

export function WelcomeCamp() {
  return (
    <section className="relative mb-6 min-h-[280px] overflow-hidden rounded-[22px] border border-[#e1e7d1] bg-[#eef0df] p-7 sm:p-9">
      <img
        src="/assets/camp-landscape.png"
        alt="森林营地与等待你归来的小屋"
        className="absolute inset-0 h-full w-full object-cover object-[70%_65%]"
      />
      <div className="absolute inset-0 bg-linear-to-r from-[#f4f4e5] via-[#f4f4e5]/80 to-transparent sm:via-[#f4f4e5]/20" />
      <div className="relative max-w-lg">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#d9e4c6] bg-white/60 px-2.5 py-1 text-[9px] tracking-widest text-[#7e9562]">
          <Leaf className="size-3" /> A LITTLE PROGRESS, EVERY DAY
        </span>
        <h2 className="font-serif text-[29px] font-bold leading-[1.55] tracking-wide text-[#35553a] sm:text-[34px]">
          不必一口气到终点。
          <br />
          今天，先动一下。
        </h2>
        <p className="mt-3 text-xs leading-6 text-[#849475]">
          让 AI 帮你拆开大目标，
          <br className="sm:hidden" />
          把每一小步，变成值得期待的冒险。
        </p>
        <Link to="/quests/new" className="mt-5 inline-block">
          <Button>
            <Plus className="size-4" />
            开启新的冒险
            <ArrowRight className="ml-2 size-3.5" />
          </Button>
        </Link>
      </div>
      <span className="absolute bottom-4 right-5 hidden rounded-full bg-white/60 px-3 py-1.5 text-[9px] text-[#839371] sm:block">
        你的每一小步，森林都记得。
      </span>
    </section>
  )
}
