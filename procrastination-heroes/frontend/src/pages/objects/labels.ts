import type { QuestCategory } from '@/objects/quests/QuestCategory'
import type { QuestStatus } from '@/objects/quests/QuestStatus'
import type { RewardTier } from '@/objects/quests/RewardTier'
export const categories: Record<QuestCategory, string> = {
  study: '学习成长',
  creative: '灵感创作',
  health: '运动健康',
  life: '日常生活',
  research: '科研探索',
  other: '其他',
}
export const statuses: Record<QuestStatus, string> = {
  draft: '冒险草稿',
  active: '进行中',
  completed: '已通关',
  archived: '已归档',
}
export const tiers: Record<RewardTier, { label: string; coins: number; rarity: string }> = {
  daily: { label: '日常任务', coins: 10, rarity: '常见战利品' },
  challenge: { label: '挑战任务', coins: 20, rarity: '稀有战利品' },
  long_term: { label: '长期任务', coins: 30, rarity: '传说战利品' },
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
