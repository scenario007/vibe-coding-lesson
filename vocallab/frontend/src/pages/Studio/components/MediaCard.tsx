import { useId, useRef, useState } from 'react'
import { CircleAlert, FileAudio, Headphones, Mic2, Music2, UploadCloud, X } from 'lucide-react'
import { GetMediaAudioAPI } from '../../../apis/analysis/GetMediaAudioAPI'
import type { Limits, Role } from '../../../apis/analysis/contracts'
import { Panel } from '../../../components/ui/Panel'
import { Button } from '../../../components/ui/Button'
import type { Upload, ReadyUpload } from '../objects/Upload'

const labels = {
  reference: { title: '原唱', purpose: '作为旋律与节奏的参考', icon: Music2, color: 'text-accent', bg: 'bg-[#282139]' },
  user: { title: '我的演唱', purpose: '上传你要对比的录音或视频', icon: Mic2, color: 'text-mint', bg: 'bg-[#1c3434]' },
}

function RangeEditor({ state, maximum, update }: { state: ReadyUpload; maximum: number; update: (next: ReadyUpload) => void }) {
  const { media, start, end, separate } = state
  const duration = end - start
  const setTime = (key: 'start' | 'end', value: number) => {
    if (Number.isFinite(value)) update({ ...state, [key]: Math.min(media.duration, Math.max(0, value)) })
  }
  const player = useRef<HTMLAudioElement>(null)
  return <>
    <div className="mt-4 grid grid-cols-[1fr_1fr] items-end gap-3">
      <label className="text-xs font-medium text-muted">起点（秒）
        <input aria-label="起点（秒）" className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-ink"
          type="number" min={0} max={media.duration} step={0.01} value={start} onChange={e => setTime('start', e.currentTarget.valueAsNumber)}/>
      </label>
      <label className="text-xs font-medium text-muted">终点（秒）
        <input aria-label="终点（秒）" className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-ink"
          type="number" min={0} max={media.duration} step={0.01} value={Math.round(end * 1000) / 1000} onChange={e => setTime('end', e.currentTarget.valueAsNumber)}/>
      </label>
    </div>
    <div className="relative my-4 h-4 rounded-full bg-raised">
      <div className="absolute inset-y-0 rounded-full bg-accent/60" aria-hidden="true"
        style={{ left: `${start/media.duration*100}%`, width: `${Math.max(0,duration)/media.duration*100}%` }}/>
      <input type="range" min={0} max={media.duration} step="any" value={start}
        aria-label="拖动片段起点" className="clip-handle"
        onChange={e => setTime('start', Math.max(0, Math.min(end-1, e.currentTarget.valueAsNumber)))}/>
      <input type="range" min={0} max={media.duration} step="any" value={end}
        aria-label="拖动片段终点" className="clip-handle"
        onChange={e => setTime('end', Math.max(start+1, e.currentTarget.valueAsNumber))}/>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span className={duration < 1 || duration > maximum ? 'text-danger' : ''}>已选 {duration.toFixed(2)} 秒 · 可分析 1–{maximum} 秒</span>
      <Button variant="text" className="min-h-8" onClick={() => {
        const audio = player.current
        if (audio) { audio.currentTime = start; void audio.play().catch(() => {}) }
      }}><Headphones size={14}/> 试听选段</Button>
    </div>
    <audio className="my-2 h-9 w-full" aria-label="原始音轨预览" controls preload="metadata" ref={player}
      src={new GetMediaAudioAPI(media.id).url()} onTimeUpdate={e => {
        if (e.currentTarget.currentTime >= end && !e.currentTarget.paused) e.currentTarget.pause()
      }}/>
    <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-canvas/50 p-3">
      <input type="checkbox" className="size-4 accent-accent" checked={separate}
        onChange={e => update({ ...state, separate: e.currentTarget.checked })}/>
      <span className="text-sm">含伴奏，分离人声</span>

    </label>
    {separate && <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">分离模式
      <select className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
        value={state.separationMode ?? 'fast'}
        onChange={e => update({ ...state, separationMode: e.currentTarget.value === 'precise' ? 'precise' : 'fast' })}>
        <option value="fast">快速 · MDX-Net</option>
        <option value="precise">精细 · BS-RoFormer</option>
      </select>
    </label>}
    <p className="mt-2 text-xs text-muted">清唱或已分离的人声可跳过分离。选段越长，分离所需时间通常越久。</p>
  </>
}

export function MediaCard({ role, state, limits, choose, clear, update }: {
  role: Role; state: Upload; limits?: Limits; choose: (file: File) => void;
  clear: () => void; update: (next: ReadyUpload) => void;
}) {
  const label = labels[role]
  const Icon = label.icon
  const input = useRef<HTMLInputElement>(null)
  const labelId = useId()
  const [drag, setDrag] = useState(false)
  return <Panel aria-labelledby={labelId} className="p-5 sm:p-6">
    <div className="mb-5 flex items-center gap-3.5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${label.color} ${label.bg}`}><Icon size={21}/></span>
      <div><h2 id={labelId} className="font-bold">{label.title}</h2><p className="mt-0.5 text-xs text-muted">{label.purpose}</p></div>
    </div>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label={`${label.title}文件`}
      accept=".wav,.mp3,.m4a,.mp4,.mov" onChange={e => {
        const file = e.currentTarget.files?.[0]
        if (file) choose(file)
        e.currentTarget.value = ''
      }}/>
    {state.status === 'ready' ? <>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-3.5">
        <FileAudio size={20} className={`shrink-0 ${label.color}`}/>
        <div className="min-w-0 flex-1">
          <p title={state.media.name} className="truncate text-sm font-semibold">{state.media.name}</p>
          <p className="mt-1 text-xs text-muted">{state.media.format.toUpperCase()} · {state.media.duration.toFixed(2)} 秒 · {(state.media.sizeBytes/1048576).toFixed(2)} MiB</p>
        </div>
        <Button variant="text" className="min-h-8 px-2" onClick={clear} aria-label={`移除${label.title}`}><X size={16}/></Button>
      </div>
      {state.media.audioStreams > 1 && <p className="mt-2 text-xs text-muted">共 {state.media.audioStreams} 条音轨，采用容器默认音轨或首条音轨。</p>}
      {Math.abs(state.media.audioStart) > 0.05 && <p className="mt-2 text-xs text-muted">音轨起点 {state.media.audioStart.toFixed(2)} 秒，已保留媒体时间位置。</p>}
      <RangeEditor state={state} maximum={limits?.maxClip ?? 300} update={update}/>
    </> : state.status === 'uploading' ?
      <div role="status" className="grid min-h-44 content-center gap-3 rounded-xl border border-line bg-canvas p-5">
        <p className="truncate text-sm font-medium">{state.name}</p>
        <p className="text-xs text-muted">{state.progress < 1 ? '正在上传' : '正在验证并解码音轨'}</p>
        {state.progress < 1 && <progress max={1} value={state.progress} className="h-2 w-full accent-accent"/>}
        <Button variant="text" className="w-fit" onClick={clear}>取消上传</Button>
      </div> :
      <button type="button"
        className={`flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-6 transition-colors hover:border-accent/65 hover:bg-[#201d2c] ${drag ? 'border-accent bg-raised' : 'border-[#474155] bg-[#14161e]'}`}
        onClick={() => input.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const file = e.dataTransfer.files[0]; if (file) choose(file) }}>
        <UploadCloud size={25} className={`mb-1 ${label.color}`}/>
        <span className="text-sm font-semibold">选择文件或拖放到此处</span>
        <span className="text-xs text-muted">WAV、MP3、M4A、MP4、MOV</span>
      </button>}
    {state.status === 'error' && <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-danger"><CircleAlert size={16}/>{state.message}</p>}
  </Panel>
}
