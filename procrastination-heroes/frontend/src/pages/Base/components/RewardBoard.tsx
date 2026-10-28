import { Card, Emblem, Pill } from '@/components/ui'
import type { TaskReward } from '@/objects/economy/TaskReward'

const fixedRewards = new Set(['book:作业书本', 'dumbbell:坚持哑铃', 'microscope:好奇心显微镜'])

export function RewardBoard({ rewards }: { rewards: TaskReward[] }) {
  const groups = Array.from(
    rewards.reduce((map, reward) => {
      const fixedKey = `${reward.design.symbol}:${reward.design.name}`
      const key = fixedRewards.has(fixedKey) ? fixedKey : reward.id
      const current = map.get(key)
      map.set(key, { reward: current?.reward || reward, count: (current?.count || 0) + 1 })
      return map
    }, new Map<string, { reward: TaskReward; count: number }>()),
  ).map(([, value]) => value)
  return (
    <Card className="mt-6 border-2 border-[#332820] bg-[#eadcc1] shadow-[4px_5px_0_#33282035]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[.25em] text-[#8a785d]">THE LOOT WALL</p>
          <h2 className="mt-1 font-serif text-xl font-bold text-[#665d3e]">奖品展板</h2>
        </div>
        <Pill tone="gold">{rewards.length} 次获得</Pill>
      </div>
      {groups.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(({ reward, count }) => (
            <div
              key={reward.id}
              className="relative rounded-xl border border-[#b8a17a] bg-[#fff8e7] p-4 text-center"
            >
              {count > 1 && (
                <span className="absolute right-2 top-2 rounded-full bg-[#a94732] px-2 py-1 text-[10px] font-bold text-white">
                  x{count}
                </span>
              )}
              <div className="mb-2 flex justify-center">
                <Emblem
                  symbol={reward.design.symbol}
                  palette={reward.design.palette}
                  imageUrl={reward.design.imageUrl}
                  size="normal"
                />
              </div>
              <p className="text-xs font-semibold text-[#665d3e]">{reward.design.name}</p>
              <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-[#8a785d]">
                {reward.design.story}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-xs leading-6 text-[#8a785d]">
          完成第一份委托，奖品会被钉上这块展板。
        </p>
      )}
    </Card>
  )
}
