import { ArrowRight, AudioLines, Info, LoaderCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { MediaCard } from './components/MediaCard'
import { StudioLyrics } from './components/StudioLyrics'
import { useStudio } from './hooks/useStudio'

export default function Studio() {
  const studio = useStudio()
  const reference = studio.uploads.reference
  return <>
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-accent"><AudioLines size={18}/> 歌唱分析工作台</div>
      <h1 className="text-4xl leading-tight font-bold tracking-[-0.055em] sm:text-5xl">对比原唱与我的演唱</h1>
      <p className="mt-3 max-w-[42rem] text-sm leading-7 text-muted sm:text-base">上传两段音频或视频，查看对应乐句的音高、长音稳定性和节奏偏差，定位听得见的差异。</p>
    </section>
    <div className="grid items-start gap-4 md:grid-cols-2">
      <MediaCard role="reference" state={studio.uploads.reference} limits={studio.limits}
        choose={file => void studio.choose('reference', file)} clear={() => studio.clear('reference')}
        update={next => studio.update('reference', next)}/>
      <MediaCard role="user" state={studio.uploads.user} limits={studio.limits}
        choose={file => void studio.choose('user', file)} clear={() => studio.clear('user')}
        update={next => studio.update('user', next)}/>
    </div>
    {reference.status === 'ready' && <StudioLyrics key={reference.media.id} media={reference.media}/>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
      <p className="flex max-w-xl items-start gap-2 text-xs leading-6 text-muted">
        <Info size={15} className="mt-1 shrink-0 text-accent"/>
        <span>{studio.limits ? `单文件上限 ${studio.limits.maxBytes / 1048576} MiB · ${Math.floor(studio.limits.maxDuration/60)} 分钟。建议选择两段录音中的同一乐句。` :
          '正在读取文件限制。建议选择两段录音中的同一乐句。'}</span>
      </p>
      <Button variant="primary" className="min-h-11 px-5" disabled={!studio.canStart || studio.loading} onClick={() => void studio.start()}>
        {studio.loading ? <LoaderCircle className="animate-spin" size={16}/> : null}
        开始分析 <ArrowRight size={16}/>
      </Button>
    </div>
    {studio.error && <p className="mt-4 text-sm text-danger" role="alert">{studio.error}</p>}
  </>
}
