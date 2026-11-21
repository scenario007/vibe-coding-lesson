import { useEffect, useRef, useState } from 'react'
import { CircleCheck, CircleHelp, CircleX, KeyRound, LoaderCircle, Plug, X } from 'lucide-react'
import type { CoachConnectionTest } from '../apis/coach/contracts'
import { GetCoachSettingsAPI } from '../apis/coach/GetCoachSettingsAPI'
import { SetCoachKeyAPI, type CoachKeyKind } from '../apis/coach/SetCoachKeyAPI'
import { TestCoachConnectionAPI } from '../apis/coach/TestCoachConnectionAPI'
import { Button } from './ui/Button'

const checkStyles = {
  ok: ['可用', CircleCheck, 'text-mint'],
  failed: ['失败', CircleX, 'text-danger'],
  inconclusive: ['待确认', CircleHelp, 'text-amber-200'],
  unconfigured: ['未配置', CircleHelp, 'text-muted'],
} as const

function SettingsDialog({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState<Awaited<ReturnType<GetCoachSettingsAPI['send']>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<CoachKeyKind>('deepseek')
  const [key, setKey] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [result, setResult] = useState<CoachConnectionTest | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    dialog.current?.showModal()
    new GetCoachSettingsAPI().send(controller.signal).then(setView).catch((cause: Error) => {
      if (!controller.signal.aborted) setError(cause.message)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  async function save(value: string | null) {
    setBusy('save')
    setNotice('')
    setError('')
    setResult(null)
    try {
      setView(await new SetCoachKeyAPI(kind, value).send())
      setKey('')
      setNotice(value === null ? '已移除此处设置，恢复项目配置。' : '密钥已保存。')
      onChanged?.()
    } catch (cause) { setError((cause as Error).message) }
    finally { setBusy(null) }
  }

  async function test() {
    setBusy('test')
    setError('')
    setResult(null)
    try { setResult(await new TestCoachConnectionAPI().send()) }
    catch (cause) { setError((cause as Error).message) }
    finally { setBusy(null) }
  }

  return <dialog ref={dialog} onClose={onClose} onCancel={event => { if (busy) event.preventDefault() }}
    aria-labelledby="coach-settings-title"
    className="m-auto max-h-[90dvh] w-[min(31rem,calc(100%-2rem))] overflow-auto rounded-2xl border border-line bg-panel p-5 text-ink shadow-xl backdrop:bg-black/65 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 id="coach-settings-title" className="text-lg font-bold">AI 服务设置</h2>
        <p className="mt-1 text-xs text-muted">密钥保存到本机，保存后即时生效。</p>
      </div>
      <Button variant="text" aria-label="关闭" className="min-h-8 px-2" disabled={!!busy} onClick={() => dialog.current?.close()}><X size={18}/></Button>
    </div>
    {loading && <p className="mt-4 text-sm text-muted" role="status">正在读取配置…</p>}
    {!loading && <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); void save(key) }}>
      <label className="grid gap-1.5 text-sm">密钥用途
        <select className="rounded-lg border border-line bg-canvas p-2" value={kind} disabled={!!busy} onChange={event => {
          setKind(event.target.value as CoachKeyKind)
          setKey('')
          setNotice('')
        }}>
          <option value="deepseek">DeepSeek 官方（文本和联网）</option>
          <option value="ai">课程 TokenHub 文本服务</option>
          <option value="search">Brave Search（可选）</option>
        </select>
      </label>
      {kind === 'deepseek' && <p className="text-xs text-muted">文本分析、教练问答和联网研究共用这把 DeepSeek Key。</p>}
      <label className="grid gap-1.5 text-sm">API Key
        <input className="rounded-lg border border-line bg-canvas p-2" type="password" value={key}
          autoComplete="off" spellCheck={false} minLength={8} maxLength={4096} disabled={!!busy}
          onChange={event => { setKey(event.target.value); setNotice('') }}
          placeholder={view?.configuredKeys.includes(kind) ? '已配置 · 可粘贴新密钥替换' : '粘贴 API Key'}/>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" type="submit" disabled={!!busy || key.trim().length < 8}>保存密钥</Button>
        {view?.keyOverrides.includes(kind) && <Button disabled={!!busy} onClick={() => void save(null)}>恢复项目配置</Button>}
      </div>
    </form>}
    {notice && <p role="status" className="mt-2 text-sm text-mint">{notice}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    {view && <section className="mt-5 space-y-3 border-t border-line pt-4" aria-label="连接测试">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{view.model ?? '文本模型未配置'}</p>
        <Button disabled={!!busy || !!key.trim() || (!view.model && view.searchProvider === 'none')} onClick={() => void test()}>
          {busy === 'test' ? <LoaderCircle size={16} className="animate-spin"/> : <Plug size={16}/>}
          {busy === 'test' ? '正在测试…' : '测试连接'}
        </Button>
      </div>
      <p className="text-xs text-muted">{key.trim() ? '先保存这把密钥，再测试连接。' : '测试当前生效的文本和联网配置，发送少量测试请求，可能产生费用。'}</p>
      {result && <ul className="grid gap-2 sm:grid-cols-2" aria-live="polite">
        {([['文本模型', result.text], ['联网检索', result.search]] as const).map(([label, check]) => {
          const [state, Icon, color] = checkStyles[check.status]
          return <li key={label} className="rounded-lg border border-line bg-canvas p-2.5">
            <p className={`flex items-center gap-1.5 text-sm font-semibold ${color}`}><Icon size={15}/> {label} · {state}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{check.message}</p>
          </li>
        })}
      </ul>}
    </section>}
  </dialog>
}

export function CoachSettings({ onChanged, variant = 'secondary' }: { onChanged?: () => void; variant?: 'secondary' | 'text' }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button variant={variant} onClick={() => setOpen(true)}><KeyRound size={16}/> AI 服务设置</Button>
    {open && <SettingsDialog onClose={() => setOpen(false)} onChanged={onChanged}/>}
  </>
}
