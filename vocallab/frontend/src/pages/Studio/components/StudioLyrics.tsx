import type { Media } from '../../../apis/analysis/contracts'
import { Panel } from '../../../components/ui/Panel'
import { LyricsPicker } from '../../lyrics/LyricsPicker'
import { useLyrics } from '../../lyrics/useLyrics'

export function StudioLyrics({ media }: { media: Media }) {
  const lyrics = useLyrics(media.id, media.duration)
  return <Panel className="mt-5 p-4 sm:p-5">
    <details open={lyrics.selected ? true : undefined}>
      <summary className="cursor-pointer text-sm font-semibold">查询同步歌词（选填）</summary>
      <div className="mt-3"><LyricsPicker lyrics={lyrics} duration={media.duration}/></div>
    </details>
  </Panel>
}
