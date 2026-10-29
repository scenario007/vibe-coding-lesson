import { Button, Card, Emblem, ErrorState, Field, Pill, inputClass } from '@/components/ui'
import type { QuestCategory } from '@/objects/quests/QuestCategory'
import type { RewardTier } from '@/objects/quests/RewardTier'
import type { FixedMode } from '@/objects/quests/FixedMode'
import { fixedModes } from '@/objects/quests/FixedMode'
import type { QuestDetail } from '@/objects/quests/apiTypes/QuestDetail'
import { categories, tiers } from '@/pages/objects/labels'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
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
                label="每天投入时间（可选）"
                type="number"
                min={5}
                max={480}
                value={f.dailyMinutes ?? ''}
                onChange={(e) => f.setDailyMinutes(e.target.value ? Number(e.target.value) : null)}
                placeholder="留空，按状态灵活推进"
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
                固定模式（可选）
                <select
                  className={inputClass}
                  value={f.fixedMode || ''}
                  onChange={(e) => f.setFixedMode((e.target.value || null) as FixedMode | null)}
                >
                  <option value="">自由设计奖励</option>
                  {Object.entries(fixedModes).map(([v, item]) => (
                    <option key={v} value={v}>
                      {item.label} · 固定奖品
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[#665d3e]">任务等级</span>
                <span className="text-[10px] text-[#8a785d]">等级决定战利品稀有度</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.entries(tiers).map(([value, item]) => (
                  <button
                    type="button"
                    disabled={disabled}
                    key={value}
                    onClick={() => f.setTier(value as RewardTier)}
                    className={
                      'rounded-xl border px-3 py-3 text-left text-xs ' +
                      (f.tier === value
                        ? 'border-[#a94732] bg-[#eadcc1] text-[#665d3e]'
                        : 'border-[#eadcc1] bg-[#fff8e7] text-[#8a785d]')
                    }
                  >
                    <span className="block font-semibold">{item.label}</span>
                    <span className="mt-1 block text-[10px]">{item.rarity}</span>
                  </button>
                ))}
              </div>
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
                    <div className="flex items-end text-[10px] leading-5 text-[#8a785d]">
                      阶段参考节奏：
                      {stage.minutes <= 20 ? '轻量' : stage.minutes <= 45 ? '标准' : '深度'}
                    </div>
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
              这是一条里程碑路线，参考节奏会随你的状态调整 · 可以调整后再出发
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
            <Emblem
              size="large"
              symbol={f.reward.symbol}
              palette={f.reward.palette}
              imageUrl={f.reward.imageUrl}
            />
          </div>
          <p className="mb-4 text-center text-[9px] tracking-widest text-[#716449]">
            任务定制 · {f.reward.imageUrl ? 'AI 生图素材' : '公会手绘部件'}
          </p>
          <fieldset disabled={disabled} className="space-y-4">
            <Field
              label="纪念物名称"
              value={f.reward.name}
              onChange={(e) => f.setReward({ ...f.reward, name: e.target.value, imageUrl: null })}
              maxLength={60}
            />
            <label className="grid gap-2 text-xs text-[#716449]">
              它想对你说
              <textarea
                value={f.reward.story}
                onChange={(e) =>
                  f.setReward({ ...f.reward, story: e.target.value, imageUrl: null })
                }
                maxLength={500}
                className={inputClass + ' min-h-24 bg-white/70 text-xs'}
              />
            </label>
          </fieldset>
          <Button
            className="mt-4 w-full"
            variant="secondary"
            disabled={disabled || !!f.fixedMode}
            onClick={() => void f.generate(true)}
          >
            <WandSparkles className="size-3.5" />
            {f.fixedMode ? '固定模式奖品已预先准备' : 'AI 再设计一份奖励'}
          </Button>
          {f.fixedMode && (
            <p className="mt-3 text-center text-[10px] leading-5 text-[#8a785d]">
              固定模式会使用协会预制的 {fixedModes[f.fixedMode].label} 奖品。
            </p>
          )}
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
