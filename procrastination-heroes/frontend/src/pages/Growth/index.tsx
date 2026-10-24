import { GetDashboardAPI } from '@/apis/adventure/GetDashboardAPI'
import { ListRewardHistoryAPI } from '@/apis/economy/ListRewardHistoryAPI'
import { Card, ErrorState, Loading, PageTitle } from '@/components/ui'
import { useResource } from '@/system/hooks/useResource'
import { usePlayer } from '@/system/stores/player'
import { ScrollText, Sparkles, Timer, Trophy } from 'lucide-react'
import { MemoryGallery } from './components/MemoryGallery'
import { Milestones } from './components/Milestones'
import { RewardTimeline } from './components/RewardTimeline'
import { WeeklyProgress } from './components/WeeklyProgress'
export default function Growth() {
  const { revision } = usePlayer()
  const r = useResource(
    () => Promise.all([new GetDashboardAPI().send(), new ListRewardHistoryAPI().send()]),
    [revision],
  )
  if (r.state.status === 'loading') return <Loading />
  if (r.state.status === 'error') return <ErrorState message={r.state.message} retry={r.reload} />
  const [data, events] = r.state.data
  const max = Math.max(1, ...data.week.map((d) => d.steps))
  const weekMinutes = Math.floor(data.week.reduce((n, d) => n + d.focusSeconds, 0) / 60)
  return (
    <>
      <PageTitle
        eyebrow="EVERY LITTLE STEP COUNTS"
        title="成长档案"
        description="有些变化很安静，但回头看，你已经走了这么远。"
      />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: '完成的冒险', value: data.completedCount, unit: '项', Icon: ScrollText },
          { label: '累计成长', value: data.progress.experience, unit: 'XP', Icon: Sparkles },
          { label: '本周专注', value: weekMinutes, unit: '分钟', Icon: Timer },
          { label: '专属纪念物', value: data.rewards.length, unit: '件', Icon: Trophy },
        ].map(({ label, value, unit, Icon }) => (
          <Card key={label}>
            <div className="flex justify-between text-[11px] text-[#98a58a]">
              {label}
              <Icon className="size-4 text-[#aabd96]" />
            </div>
            <p className="mt-4 font-serif text-3xl font-bold text-[#728d5a]">
              {value}
              <span className="ml-2 text-[10px] font-normal text-[#a6b094]">{unit}</span>
            </p>
          </Card>
        ))}
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <WeeklyProgress data={data} max={max} />
        <Milestones data={data} events={events} />
      </div>
      <MemoryGallery data={data} />
      <RewardTimeline data={data} events={events} />
    </>
  )
}
