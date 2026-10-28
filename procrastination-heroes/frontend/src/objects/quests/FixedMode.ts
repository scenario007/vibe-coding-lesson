import type { RewardDraft } from '@/objects/economy/RewardDraft'

export type FixedMode = 'assignment' | 'exercise' | 'research'

export const fixedModes: Record<FixedMode, { label: string; reward: RewardDraft }> = {
  assignment: {
    label: '作业',
    reward: {
      name: '作业书本',
      story: '把要交的东西一页页压平，今天也算推进。',
      symbol: 'book',
      palette: 'sage',
    },
  },
  exercise: {
    label: '运动',
    reward: {
      name: '坚持哑铃',
      story: '不追求热血传奇，先把这一组做完。',
      symbol: 'dumbbell',
      palette: 'gold',
    },
  },
  research: {
    label: '科研',
    reward: {
      name: '好奇心显微镜',
      story: '把一个小问题放大，直到它愿意露出线索。',
      symbol: 'microscope',
      palette: 'sky',
    },
  },
}
