import { ErrorState, Loading, PageTitle } from '@/components/ui'
import { CalendarDays } from 'lucide-react'
import { ActiveAdventures } from './components/ActiveAdventures'
import { DailyChallenges } from './components/DailyChallenges'
import { DailyOverview } from './components/DailyOverview'
import { HeroProfile } from './components/HeroProfile'
import { RecentMemories } from './components/RecentMemories'
import { WelcomeCamp } from './components/WelcomeCamp'
import { useDashboard } from './hooks/useDashboard'
export default function Dashboard() {
  const { state, reload } = useDashboard()
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorState message={state.message} retry={reload} />
  const data = state.data
  const level = 1 + Math.floor(data.progress.experience / 100)
  const active = data.quests.filter((q) => q.quest.status === 'active')
  const draft = data.quests.filter((q) => q.quest.status === 'draft')
  const now = new Date()
  const greeting =
    Number(
      new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        hour12: false,
        timeZone: 'Asia/Shanghai',
      }).format(now),
    ) < 12
      ? '早上好'
      : '你好'
  return (
    <>
      <PageTitle
        eyebrow="YOUR LITTLE ADVENTURE"
        title={`${greeting}，${data.user.nickname}`}
        description="欢迎回到协会。今天，也按自己的节奏慢慢来。"
        action={
          <span className="flex items-center gap-2 text-xs text-[#99a48b]">
            <CalendarDays className="size-3.5" />
            {now.toLocaleDateString('zh-CN', {
              timeZone: 'Asia/Shanghai',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </span>
        }
      />
      <WelcomeCamp />
      <DailyOverview data={data} />
      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <ActiveAdventures active={active} draft={draft} />
          <DailyChallenges data={data} />
        </div>
        <div className="space-y-6">
          <HeroProfile data={data} level={level} />
          <RecentMemories data={data} />
        </div>
      </div>
    </>
  )
}
