import { Button, Card, Emblem, ErrorState, Field, Pill, inputClass } from '@/components/ui'
import type { QuestCategory } from '@/objects/quests/QuestCategory'
import type { RewardTier } from '@/objects/quests/RewardTier'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import { categories, tiers } from '@/pages/objects/labels'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Coins,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { useQuestEditor } from '../hooks/useQuestEditor'
export function QuestEditor({
  initial,
  onSaved,
}: {
  initial: QuestDetail | null
  onSaved: (q: QuestDetail) => void
}) {
  const f = useQuestEditor(initial, onSaved)
  const disabled = !!f.busy
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.7fr_1fr]">
      <div className="space-y-5">
        <Card>
          <div className="mb-5 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-[#eadcc1] text-xs text-[#716449]">
              01
            </span>
            <h2 className="text-sm font-semibold">你想完成什么？</h2>
            <Pill>AI 冒险规划师</Pill>
          </div>
          <fieldset disabled={disabled} className="space-y-5">
            <Field
              label="目标 / 任务名称"
              value={f.title}
              onChange={(e) => f.setTitle(e.target.value)}
              maxLength={100}
              placeholder="例如：两周内完成课程的前后端项目"
            />
            <div className="flex flex-wrap gap-2">
              {['完成课程选题', '整理我的书桌', '读完一本想读的书'].map((v) => (
                <button
                  key={v}
                  className="rounded-lg bg-[#eadcc1] px-2.5 py-1.5 text-[10px] text-[#716449]"
                  onClick={() => f.setTitle(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="希望什么时候完成（可选）"
                type="date"
                value={f.dueDate}
                onChange={(e) => f.setDueDate(e.target.value)}
              />
              <Field
                label="每天可以投入多少分钟？"
                type="number"
                min={5}
                max={480}
                value={f.dailyMinutes}
                onChange={(e) => f.setDailyMinutes(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-[#665d3e]">
                任务分类
                <select
                  className={inputClass}
                  value={f.category}
                  onChange={(e) => f.setCategory(e.target.value as QuestCategory)}
                >
                  {Object.entries(categories).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#665d3e]">
                奖励风格
                <select
                  className={inputClass}
                  value={f.preference}
                  onChange={(e) => f.setPreference(e.target.value)}
                >
                  <option>温暖手账</option>
                  <option>森林冒险</option>
                  <option>星空童话</option>
                  <option>像素冒险</option>
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-[#665d3e]">
              已经完成什么，或卡在哪里？
              <textarea
                value={f.feedback}
                onChange={(e) => f.setFeedback(e.target.value)}
                maxLength={1000}
                className={inputClass + ' min-h-20 resize-y'}
                placeholder="也可以告诉 AI：第一步再小一点 / 每天只有二十分钟…"
              />
            </label>
          </fieldset>
          <div className="mt-5">
            <Button className="w-full" disabled={disabled} onClick={() => void f.generate()}>
              {disabled ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {f.busy || '帮我拆成小步骤，并设计奖励'}
            </Button>
            <button
              disabled={disabled}
              onClick={() => void f.recover()}
              className="mt-3 w-full text-center text-[10px] text-[#716449] underline underline-offset-4"
            >
              找回最近的 AI 草案
            </button>
            <p className="mt-3 text-center text-[10px] leading-5 text-[#8a785d]">
              AI 会返回可修改的草案，确认后才开始。每次生成按 Token 计入右上角账本，不自动重试。
            </p>
          </div>
        </Card>
        {f.error && <ErrorState message={f.error} />}{' '}
        {f.notice && (
          <div
            role="status"
            className="flex gap-2 rounded-xl bg-[#eadcc1] p-4 text-xs leading-6 text-[#716449]"
          >
            <Check className="mt-1 size-4 shrink-0" />
            {f.notice}
          </div>
        )}
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid size-7 place-items-center rounded-lg bg-[#eadcc1] text-xs text-[#716449]">
                02
              </span>
              把路分成小小的关卡
            </h2>
            <span className="text-[10px] text-[#716449]">{f.stages.length} / 5 个阶段</span>
          </div>
          {f.stages.length ? (
            <div className="space-y-4">
              {f.stages.map((stage, index) => (
                <fieldset
                  disabled={disabled}
                  key={index}
                  className="rounded-xl border border-[#eadcc1] bg-[#fff8e7] p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#eadcc1] text-[10px] font-semibold text-[#716449]">
                      {index + 1}
                    </span>
                    <input
                      aria-label={`第${index + 1}阶段名称`}
                      className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-sm font-medium outline-none focus:border-[#8a785d]"
                      value={stage.title}
                      onChange={(e) => f.updateStage(index, { title: e.target.value })}
                      maxLength={120}
                      placeholder="一个具体、能行动的步骤"
                    />
                    <button
                      aria-label="上移阶段"
                      disabled={index === 0 || disabled}
                      onClick={() => f.moveStage(index, -1)}
                      className="p-1 text-[#8a785d] disabled:opacity-20"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      aria-label="下移阶段"
                      disabled={index === f.stages.length - 1 || disabled}
                      onClick={() => f.moveStage(index, 1)}
                      className="p-1 text-[#8a785d] disabled:opacity-20"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      aria-label="删除阶段"
                      onClick={() => f.removeStage(index)}
                      className="p-1 text-[#8a785d]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <textarea
                    aria-label="步骤说明"
                    className={inputClass + ' min-h-16 bg-white/80'}
                    value={stage.description}
                    onChange={(e) => f.updateStage(index, { description: e.target.value })}
                    maxLength={1200}
                    placeholder="具体准备怎么做？"
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_100px]">
                    <Field
                      label="怎样算完成？"
                      value={stage.criterion}
                      onChange={(e) => f.updateStage(index, { criterion: e.target.value })}
                      maxLength={300}
                      placeholder="例如：列出三个可行选题"
                    />
                    <Field
                      label="预计分钟"
                      type="number"
                      min={1}
                      max={480}
                      value={stage.minutes}
                      onChange={(e) => f.updateStage(index, { minutes: Number(e.target.value) })}
                    />
                  </div>
                  <label className="mt-3 grid gap-2 text-[10px] text-[#716449]">
                    行动清单（每行一项，最多五项）
                    <textarea
                      value={stage.checklist.join('\n')}
                      onChange={(e) =>
                        f.updateStage(index, {
                          checklist: e.target.value.split('\n').filter(Boolean).slice(0, 5),
                        })
                      }
                      className={inputClass + ' min-h-14 text-xs'}
                      placeholder="先打开文档，写下一个想法"
                    />
                  </label>
                  <p className="mt-3 text-[9px] text-[#8a785d]">
                    {stage.dependsOn.length
                      ? `在第 ${stage.dependsOn.map((v) => v + 1).join('、')} 步之后推进`
                      : '可以从这里开始'}{' '}
                    · 奖励总额会在各阶段间分配
                  </p>
                </fieldset>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs leading-7 text-[#8a785d]">
              让 AI 帮你找一条路，
              <br />
              或者从一个自己确定的小步骤开始。
            </p>
          )}
          <Button
            className="mt-4 w-full"
            variant="secondary"
            disabled={disabled || f.stages.length >= 5}
            onClick={f.addStage}
          >
            <Plus className="size-3.5" />
            手动添加一个步骤
          </Button>
          {f.stages.length > 0 && (
            <p className="mt-3 text-[10px] text-[#716449]">
              预计总投入 {f.stages.reduce((n, v) => n + v.minutes, 0)} 分钟 · 可以调整后再出发
            </p>
          )}
        </Card>
        <Card>
          <label className="grid gap-2 text-sm font-medium text-[#665d3e]">
            计划说明
            <textarea
              className={inputClass + ' min-h-20'}
              maxLength={3000}
              value={f.description}
              disabled={disabled}
              onChange={(e) => f.setDescription(e.target.value)}
              placeholder="把计划和需要留意的事情记在这里"
            />
          </label>
        </Card>
      </div>
      <div className="space-y-5 xl:sticky xl:top-24">
        <Card className="bg-[#eadcc1]">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#665d3e]">这张委托的专属战利品</h2>
            <Pill tone="gold">完成后解锁</Pill>
          </div>
          <div className="my-7 flex justify-center">
            <Emblem size="large" symbol={f.reward.symbol} palette={f.reward.palette} />
          </div>
          <p className="mb-4 text-center text-[9px] tracking-widest text-[#716449]">
            任务定制 · 公会手绘部件
          </p>
          <fieldset disabled={disabled} className="space-y-4">
            <Field
              label="纪念物名称"
              value={f.reward.name}
              onChange={(e) => f.setReward({ ...f.reward, name: e.target.value })}
              maxLength={60}
            />
            <label className="grid gap-2 text-xs text-[#716449]">
              它想对你说
              <textarea
                value={f.reward.story}
                onChange={(e) => f.setReward({ ...f.reward, story: e.target.value })}
                maxLength={500}
                className={inputClass + ' min-h-24 bg-white/70 text-xs'}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                aria-label="奖励图案"
                className={inputClass}
                value={f.reward.symbol}
                onChange={(e) =>
                  f.setReward({ ...f.reward, symbol: e.target.value as typeof f.reward.symbol })
                }
              >
                {[
                  ['star', '星星'],
                  ['lamp', '小灯'],
                  ['leaf', '绿叶'],
                  ['book', '书本'],
                  ['camera', '相机'],
                  ['mountain', '山峰'],
                  ['moon', '月亮'],
                  ['flower', '花朵'],
                  ['cloud', '云朵'],
                  ['sword', '稿纸之剑'],
                  ['shield', '锅盖之盾'],
                  ['scroll', '冒险卷轴'],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                aria-label="奖励配色"
                className={inputClass}
                value={f.reward.palette}
                onChange={(e) =>
                  f.setReward({ ...f.reward, palette: e.target.value as typeof f.reward.palette })
                }
              >
                {[
                  ['sage', '森林绿'],
                  ['gold', '暖金色'],
                  ['rose', '浅玫瑰'],
                  ['lavender', '薰衣草'],
                  ['sky', '晴空蓝'],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          <Button
            className="mt-4 w-full"
            variant="secondary"
            disabled={disabled}
            onClick={() => void f.generate(true)}
          >
            <WandSparkles className="size-3.5" />
            AI 再设计一份奖励
          </Button>
        </Card>
        <Card>
          <h2 className="mb-4 text-xs font-semibold">选择冒险规模</h2>
          <div className="space-y-2">
            {Object.entries(tiers).map(([value, t]) => (
              <button
                disabled={disabled}
                key={value}
                onClick={() => f.setTier(value as RewardTier)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-xs ${f.tier === value ? 'border-[#8a785d] bg-[#eadcc1] text-[#665d3e]' : 'border-[#eadcc1] text-[#716449]'}`}
              >
                <span>{t.label}</span>
                <span className="flex items-center gap-1 text-[10px]">
                  <Coins className="size-3" />
                  {t.coins} 币 · {t.coins * 2} XP
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-6 text-[#8a785d]">
            这是整项任务的奖励总额，拆成更多步骤也不会增加。每日最多获得 60 冒险币。
          </p>
        </Card>
        <Button
          className="w-full"
          disabled={disabled || !f.stages.length}
          onClick={() => void f.save(true)}
        >
          确认计划，开始冒险
          <ArrowRight className="size-4" />
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          disabled={disabled || !f.stages.length}
          onClick={() => void f.save(false)}
        >
          先保存为草稿
        </Button>
      </div>
    </div>
  )
}
