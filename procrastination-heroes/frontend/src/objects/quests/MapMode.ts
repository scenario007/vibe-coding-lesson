export type MapMode = 'progress' | 'story' | 'base' | 'decorative' | 'off'

export const mapModes: Record<MapMode, { label: string; hint: string }> = {
  progress: { label: '进度打卡', hint: '完成一个里程碑，点亮一步' },
  story: { label: '剧情地图', hint: '把每个阶段变成一章小故事' },
  base: { label: '据点解锁', hint: '用进度解锁新的据点氛围' },
  decorative: { label: '纯装饰', hint: '只看地图，不参与任务进度' },
  off: { label: '关闭', hint: '只保留任务和战利品' },
}
