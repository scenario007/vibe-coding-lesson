import { Button, Card, ErrorState, Loading, Modal, Progress } from '@/components/ui'
import { BadgeCent, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useUsageReport } from './hooks/useUsageReport'
const money = (v: number) => '¥' + v.toFixed(4)
const labels = { reserved: '调用中·已预留', measured: '已记录用量', unconfirmed: '待核对·保留预留' }
export function UsageLedger() {
  const { state, reload } = useUsageReport()
  const [open, setOpen] = useState(false)
  const data = state.status === 'ready' ? state.data : null
  const measured = data ? data.textEstimatedCny + data.assetEstimatedCny : 0
  const held = data ? data.textHeldCny + data.assetHeldCny : 0
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="打开 AI 用量与费用账本"
        className="flex items-center gap-1.5 rounded border border-[#a38c65] bg-[#fff8e7] px-2 py-1.5 text-[10px] font-bold text-[#665d3e]"
      >
        <BadgeCent className="size-3.5" />
        <span className="hidden sm:inline">AI账本</span>
        <span>
          {data ? '约' + money(measured + held) : state.status === 'error' ? '账本离线' : '读取中'}
        </span>
        {data && held > 0 && <span className="hidden sm:inline">含预留</span>}
      </button>
      {open && (
        <Modal title="公会 AI 账本" onClose={() => setOpen(false)}>
          <p className="mb-4 text-xs leading-6 text-[#716449]">
            每 5
            秒更新本项目账本，不额外调用模型。费用按官方费率估算，平台实扣与云账户余额尚未连接。
          </p>
          {state.status === 'loading' ? (
            <Loading label="清点这轮调用…" />
          ) : state.status === 'error' ? (
            <ErrorState message={state.message} retry={reload} />
          ) : (
            <div className="space-y-4">
              <Card className="bg-[#f4e8cd]">
                <div className="flex justify-between gap-3 text-sm font-bold">
                  <span>本轮新增费用预算</span>
                  <span>¥{state.data.budgetCny.toFixed(2)}</span>
                </div>
                <p className="my-3 text-3xl font-black text-[#a94732]">
                  {money(measured)} <span className="text-xs font-normal">已观测用量对应估算</span>
                </p>
                <Progress
                  value={
                    state.data.budgetCny ? ((measured + held) / state.data.budgetCny) * 100 : 100
                  }
                  color="gold"
                />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs leading-6">
                  <span>
                    待核对 / 调用预留
                    <br />
                    <b>{money(held)}</b>
                  </span>
                  <span>
                    可用调用预算
                    <br />
                    <b>{money(state.data.remainingCny)}</b>
                  </span>
                </div>
                <p className="mt-3 text-[10px] leading-5 text-[#716449]">
                  未确认请求保留预留，不按 0 元处理。接近限额即拒绝新增文本调用；重启不会清零。
                </p>
              </Card>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <span>
                  已观测 Token
                  <br />
                  <b className="text-xl">{state.data.measuredTokens.toLocaleString()}</b>
                </span>
                <span>
                  文本估算 {money(state.data.textEstimatedCny)}
                  <br />
                  美术估算 {money(state.data.assetEstimatedCny)}
                </span>
              </div>
              <section>
                <h3 className="mb-2 text-sm font-bold">本轮素材制作记录</h3>
                {state.data.assets.length ? (
                  state.data.assets.map((a, i) => (
                    <div
                      key={a.name + i}
                      className="border-t border-dashed border-[#cabb9e] py-2 text-[11px] leading-5"
                    >
                      <b>
                        {a.name.startsWith('hero')
                          ? '勇者角色图集'
                          : a.name.startsWith('slime')
                            ? '史莱姆图集'
                            : a.name === 'room'
                              ? '公会小屋背景'
                              : '素材记录'}{' '}
                        · 请求 {i + 1}
                      </b>{' '}
                      · {a.model}
                      <br />
                      {a.status === 'succeeded' && a.tokens !== null
                        ? a.tokens.toLocaleString() + ' Token · 费用估算 '
                        : '未返回用量 · 预留 '}
                      {money(a.estimatedCny)}
                    </div>
                  ))
                ) : (
                  <p className="text-xs">暂无素材调用记录</p>
                )}
              </section>
              <section>
                <h3 className="mb-2 text-sm font-bold">我的最近文本调用</h3>
                {state.data.events.length ? (
                  state.data.events.map((e) => (
                    <div
                      key={e.id}
                      className="border-t border-dashed border-[#cabb9e] py-2 text-[11px] leading-5"
                    >
                      <b>{labels[e.status]}</b> · {money(e.estimatedCny ?? e.reservedCny)}
                      <br />
                      {e.model} ·{' '}
                      {new Date(e.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                      <br />
                      {e.inputTokens === null
                        ? '用量未确认'
                        : '输入 ' +
                          e.inputTokens +
                          ' / 输出 ' +
                          e.outputTokens +
                          ' / 缓存 ' +
                          e.cachedTokens}
                    </div>
                  ))
                ) : (
                  <p className="text-xs leading-6">
                    启用账本后尚无文本调用。旧版本调用不在本轮统计内。
                  </p>
                )}
              </section>
              <p className="text-[10px] leading-5 text-[#8a785d]">
                费率核实日期 {state.data.rateVerifiedAt}
                ；共享项目预算包含所有用户累计估算和素材档案，本人明细仅本人可见。后台不会返回 API
                密钥。
              </p>
              <Button variant="secondary" className="w-full" onClick={reload}>
                <RefreshCw className="size-3" />
                刷新账本
              </Button>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
