import type { Observation } from '../../../apis/coach/contracts'
import { noteLabel } from './timeline'

export const statuses = { measured: '已测量', insufficient: '数据不足', alignment: '对齐待确认', uncovered: '翻唱未覆盖' }

const labels: Record<string, [string, string]> = {
  duration_s: ['区间时长', '秒'], pitch_coverage: ['有效基频覆盖', '%'], activity_ratio: ['声音活动占比', '%'],
  active_s: ['声音活动时长', '秒'], representative_midi: ['主要音高', '音名'], highest_midi: ['高分位音高', '音名'],
  peak_midi: ['实测最高音', '音名'], transition_s: ['转换用时', '秒'], settled_variation_cents: ['转换后波动', '音分'],
  target_midi: ['目标音高', '音名'], onset_midi: ['起音音高', '音名'], pitch_variation_cents: ['音高变化', '音分'],
  pitch_drift_cents: ['前后音高变化', '音分'], deviation_cents: ['较参考音高偏差', '音分'],
  near_target_s: ['接近目标时长', '秒'], attack_deviation_cents: ['起音偏差', '音分'],
  overshoot_cents: ['起音过冲', '音分'], reach_target_s: ['到达目标用时', '秒'],
  rate_hz: ['周期频率', 'Hz'], amplitude_cents: ['周期幅度', '音分'], center_midi: ['周期中心音高', '音名'],
  periodicity: ['周期相关', '%'], periodic_onset_s: ['周期起点（距片段起点）', '秒'],
  activity_gaps: ['内部中断', '次'], interruption_s: ['中断总时长', '秒'],
  directional_change_cents: ['首尾音高变化', '音分'], direction_changes: ['明显转折', '次'],
  relative_db: ['相对响度', 'dB'], dynamic_range_db: ['相对动态范围', 'dB'], tail_change_db: ['末段能量变化', 'dB'],
  high_note_count: ['高音数量', '个'], high_total_s: ['高音总时长', '秒'], mean_gap_s: ['高音平均间隔', '秒'],
  relative_high_midi: ['高音阈值', '音名'], high_half_change_cents: ['后半段与前半段差异', '音分'],
}

export function metricLabel(key: string, value: number, difference = false) {
  const [name, unit] = labels[key] ?? [key, '']
  if (unit === '音名') return difference ? `${name}差 ${(value * 100).toFixed(0)} 音分` : `${name} ${noteLabel(value)}`
  const amount = unit === '%' ? Math.round(value * 100) : Number(value.toFixed(unit === '秒' ? 2 : 1))
  return `${name}${difference ? '差' : ''} ${amount}${unit === '%' ? '%' : unit ? ' ' + unit : ''}`
}

export function citations(ids: string[], observations: Observation[]) {
  const facts = new Map<string, string>()
  for (const observation of observations) {
    for (const [side, name, metrics] of [
      ['reference', '原唱', observation.reference.metrics],
      ['user', '翻唱', observation.user?.metrics ?? {}],
      ['comparison', '翻唱减原唱', observation.comparison],
    ] as const) {
      for (const [key, value] of Object.entries(metrics)) {
        facts.set(`${observation.id}/${side}/${key}`, `${name} · ${metricLabel(key, value, side === 'comparison')}`)
      }
    }
  }
  return ids.flatMap(id => facts.has(id) ? [facts.get(id)!] : [])
}
