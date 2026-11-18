import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import type { CoachView } from '../../../apis/coach/contracts'

export function CoachSettings({ view, busy, onClose, saveKey }: {
  view: CoachView; busy: boolean; onClose: () => void;
  saveKey: (kind: 'ai' | 'search', key: string | null) => Promise<boolean>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [kind, setKind] = useState<'ai' | 'search'>('ai')
  const [key, setKey] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])

  async function save(value: string | null) {
    if (await saveKey(kind, value)) {
      setKey('')
      setNotice(value === null ? '已移除此处设置，恢复项目配置。' : '密钥已保存。')
    } else setNotice('设置未保存，请检查密钥并重试。')
  }

  return <dialog ref={dialog} onClose={onClose} aria-labelledby="coach-settings-title"
    className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-line bg-panel p-4 text-ink backdrop:bg-black/60">
    <div className="flex items-center justify-between gap-2">
      <h3 id="coach-settings-title" className="font-semibold">AI 服务设置</h3>
      <Button variant="text" onClick={() => dialog.current?.close()}>关闭</Button>
    </div>
    <p className="text-xs text-muted">模型 {view.model ?? '未配置'}。密钥仅保存到本机后端，设置后即时生效。</p>
    <form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); void save(key) }}>
      <label className="grid gap-1 text-sm">密钥用途
        <select className="rounded border border-line bg-canvas p-2" value={kind} onChange={event => {
          setKind(event.target.value as typeof kind)
          setKey('')
          setNotice('')
        }}>
          <option value="ai">AI 文本服务</option>
          <option value="search">Brave Search（可选，全网页搜索）</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">API Key
        <input className="rounded border border-line bg-canvas p-2" type="password" value={key}
          autoComplete="off" spellCheck={false} minLength={8} maxLength={4096}
          onChange={event => setKey(event.target.value)} placeholder="粘贴新密钥"/>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" type="submit" disabled={busy || key.trim().length < 8}>保存密钥</Button>
        {view.keyOverrides.includes(kind) && <Button disabled={busy} onClick={() => void save(null)}>恢复项目配置</Button>}
      </div>
      {notice && <p role="status" className="text-sm text-muted">{notice}</p>}
    </form>
  </dialog>
}
