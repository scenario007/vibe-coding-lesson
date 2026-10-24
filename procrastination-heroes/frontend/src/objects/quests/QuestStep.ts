import type { QuestId } from '@/objects/quests/QuestId'
import type { StepId } from '@/objects/quests/StepId'
export interface QuestStep {
  id: StepId
  questId: QuestId
  position: number
  title: string
  description: string
  checklist: string[]
  minutes: number
  criterion: string
  dependsOn: number[]
  completedAt: number | null
  coins: number
}
