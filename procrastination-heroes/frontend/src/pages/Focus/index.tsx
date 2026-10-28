import { Card, ErrorState, PageTitle } from '@/components/ui'
import { ArrowRight, Coffee, Film, Image as ImageIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FocusHistoryPanel } from './components/FocusHistoryPanel'
import { FocusTimerPanel } from './components/FocusTimerPanel'
import { useFocus } from './hooks/useFocus'
export default function Focus() {
  const f = useFocus()
  const min = String(Math.floor(f.remaining / 60)).padStart(2, '0')
  const sec = String(f.remaining % 60).padStart(2, '0')
  return (
    <>
      <PageTitle
        eyebrow="FOCUS CAMP"
        title="史莱姆专注室"
        description="搭子已经困了，但它决定再陪你坚持一小段。"
      />
      <Card className="mb-6 bg-[#eadcc1]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#665d3e]">史莱姆陪伴素材</p>
            <p className="mt-1 text-[10px] leading-5 text-[#8a785d]">
              默认使用静态图；课程视频模型开通后，可切换 5 秒循环动画。
            </p>
          </div>
          <div className="flex gap-2 text-[10px] text-[#716449]">
            <span className="flex items-center gap-1 rounded-lg bg-[#fff8e7] px-2.5 py-2">
              <ImageIcon className="size-3" />
              静态图
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-dashed border-[#b8a17a] px-2.5 py-2">
              <Film className="size-3" />
              循环动画（可选）
            </span>
          </div>
        </div>
      </Card>
      <div className="grid items-start gap-6 xl:grid-cols-[1.7fr_1fr]">
        <FocusTimerPanel f={f} min={min} sec={sec} />
        <div className="space-y-5">
          {f.error && <ErrorState message={f.error} />}{' '}
          {f.notice && (
            <Card>
              <p role="status" className="text-xs leading-7 text-[#716449]">
                {f.notice}
              </p>
              <Link
                to="/quests"
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#716449]"
              >
                回到任务
                <ArrowRight className="size-3" />
              </Link>
            </Card>
          )}
          <FocusHistoryPanel f={f} />
          <Card className="bg-[#eadcc1]">
            <Coffee className="mb-3 size-5 text-[#8a785d]" />
            <p className="text-xs leading-7 text-[#716449]">
              专注不是一直紧绷。
              <br />
              一段结束后，站起来伸伸懒腰，
              <br />
              让脑袋也透一口气。
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
