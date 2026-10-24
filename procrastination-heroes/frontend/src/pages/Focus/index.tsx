import { Card, ErrorState, PageTitle } from '@/components/ui'
import { ArrowRight, Coffee } from 'lucide-react'
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
        title="专注营地"
        description="把外面的事情放一放，这一小段时间，只做眼前的一步。"
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.7fr_1fr]">
        <FocusTimerPanel f={f} min={min} sec={sec} />
        <div className="space-y-5">
          {f.error && <ErrorState message={f.error} />}{' '}
          {f.notice && (
            <Card>
              <p role="status" className="text-xs leading-7 text-[#809b65]">
                {f.notice}
              </p>
              <Link
                to="/quests"
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#6f8a53]"
              >
                回到任务
                <ArrowRight className="size-3" />
              </Link>
            </Card>
          )}
          <FocusHistoryPanel f={f} />
          <Card className="bg-[#f5f0e4]">
            <Coffee className="mb-3 size-5 text-[#c2ab7e]" />
            <p className="text-xs leading-7 text-[#a59a80]">
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
