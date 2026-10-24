import type { QuestCategory } from '@/objects/quests/QuestCategory'
import type { QuestStatus } from '@/objects/quests/QuestStatus'
import type { RewardTier } from '@/objects/quests/RewardTier'
export const categories: Record<QuestCategory, string> = {
  study: '学习成长',
  creative: '灵感创作',
  health: '运动健康',
  life: '日常生活',
}
export const statuses: Record<QuestStatus, string> = {
  draft: '冒险草稿',
  active: '进行中',
  completed: '已通关',
  archived: '已归档',
}
export const tiers: Record<RewardTier, { label: string; coins: number }> = {
  small: { label: '小步任务', coins: 10 },
  normal: { label: '普通任务', coins: 20 },
  main: { label: '主线任务', coins: 30 },
}
export function dateLabel(date: string | null) {
  if (!date) return '自由安排'
  return (
    new Date(date + 'T12:00:00').toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) +
    ' 截止'
  )
}
export function todayString() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date())
}
