import { Card, ErrorState, Loading, Pill } from '@/components/ui'
import { Timer } from 'lucide-react'
import { useFocus } from '../hooks/useFocus'

export function FocusHistoryPanel({ f }: { f: ReturnType<typeof useFocus> }) {
  const names = { running: '进行中', paused: '已暂停', completed: '已完成', abandoned: '提前结束' }
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Timer className="size-4 text-[#716449]" />
        最近的专注
      </h2>
      {f.history.state.status === 'ready' ? (
        f.history.state.data.length ? (
          <div className="space-y-3">
            {f.history.state.data.slice(0, 7).map((s) => (
              <div
                key={s.id}
                className="flex justify-between border-b border-[#eadcc1] pb-3 text-xs"
              >
                <div>
                  <p className="text-[#716449]">
                    {Math.floor(s.elapsedSeconds / 60)} 分钟
                    {['running', 'paused'].includes(s.status) ? ' · 进行中的会话' : ''}
                  </p>
                  <p className="mt-1 text-[9px] text-[#8a785d]">
                    {new Date(s.createdAt).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <Pill>{names[s.status]}</Pill>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-7 text-center text-xs leading-7 text-[#8a785d]">
            这里会记下你的专注时光。
            <br />
            从今天的一小段开始吧。
          </p>
        )
      ) : f.history.state.status === 'error' ? (
        <ErrorState message={f.history.state.message} retry={f.history.reload} />
      ) : (
        <Loading />
      )}
    </Card>
  )
}
