import type { Media } from '../../../apis/analysis/contracts'

export type Upload =
  | { status: 'empty' }
  | { status: 'uploading'; name: string; progress: number }
  | { status: 'error'; message: string }
  | { status: 'ready'; media: Media; start: number; end: number; separate: boolean; separationMode?: 'fast' | 'precise' }
export type ReadyUpload = Extract<Upload, { status: 'ready' }>
