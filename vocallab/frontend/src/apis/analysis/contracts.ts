import { z } from 'zod'

const seconds = z.number().nonnegative()
const fraction = z.number().min(0).max(1)
const id = z.uuid()
export const role = z.enum(['reference', 'user'])
export const trackKind = z.enum(['original', 'vocals', 'instrumental'])
export const jobStatus = z.enum(['pending', 'processing', 'completed', 'failed'])
export const stage = z.enum(['queued', 'decode', 'separation_reference', 'separation_user', 'pitch_reference',
  'pitch_user', 'alignment', 'metrics', 'report', 'completed', 'failed'])
export const media = z.object({
  id, name: z.string(), format: z.enum(['wav', 'mp3', 'm4a', 'mp4', 'mov']), duration: seconds,
  sizeBytes: z.number().int().nonnegative(), sampleRate: z.number().int().positive(),
  channels: z.number().int().positive(), audioStream: z.number().int().nonnegative(),
  audioStreams: z.number().int().positive(), audioStart: z.number(), hasVideo: z.boolean(),
})
export const limits = z.object({
  maxBytes: z.number().int().positive(), maxClip: z.number().int().positive(),
})
export const separationMode = z.enum(['fast', 'precise'])
export const clipSelection = z.object({ mediaId: id, start: seconds, end: seconds, separate: z.boolean(), separationMode: separationMode.nullish() })
export const selection = z.object({
  reference: clipSelection, user: clipSelection, manualOffset: z.number().nullable(),
  alignmentReferenceRange: z.tuple([seconds, seconds]).nullish(),
})
export const job = z.object({ analysisId: id, status: jobStatus, stage, error: z.string().nullable(),
  selection, createdAt: z.string() })
const track = z.object({
  timestamps: z.array(seconds).min(2), originalStart: seconds, f0Hz: z.array(z.number().positive().nullable()),
  guideMidiPitch: z.array(z.number().nullable()).nullish(),
  midiPitch: z.array(z.number().nullable()), voicedFlags: z.array(z.boolean()),
  voicedProbabilities: z.array(fraction), rms: z.array(z.number().nonnegative()),
}).refine(t => [t.f0Hz, t.midiPitch, t.voicedFlags, t.voicedProbabilities, t.rms].every(series => series.length === t.timestamps.length) && (!t.guideMidiPitch || t.guideMidiPitch.length === t.timestamps.length))
const pair = <T extends z.ZodType>(shape: T) => z.object({ reference: shape, user: shape })
const harmonicPitch = z.object({
  step: z.literal(.02), midiPitch: z.array(z.number().min(36).max(84).nullable()).min(2),
  bridgedFrames: z.array(z.number().int().nonnegative()).nullish(),
}).refine(t => t.bridgedFrames?.every((i, j, frames) => t.midiPitch[i] != null &&
  (j === 0 || i > frames[j - 1])) ?? true)
export const pitchPreview = pair(harmonicPitch.nullable())
export type PitchPreview = z.infer<typeof pitchPreview>
export type HarmonicPitch = z.infer<typeof harmonicPitch>
const separation = z.object({
  enabled: z.boolean(), model: z.string().nullable(), modelVersion: z.string().nullable(),
  status: z.enum(['skipped', 'completed']), outputTracks: z.array(trackKind), inputTrack: trackKind,
  warnings: z.array(z.string()), weightSha256: z.string().nullable(), device: z.string().nullable(), cached: z.boolean(),
  parameters: z.object({ segment_size: z.number().int(), override_model_segment_size: z.boolean(),
    overlap: z.number().int(), batch_size: z.number().int(), pitch_shift: z.number().int() }).nullable(),
})
const alignmentFeatureScores = z.record(z.string(), z.object({
  offsetSeconds: z.number(), score: z.number().min(-1).max(1), peakScore: z.number().min(-1).max(1),
}))
const alignmentDetection = z.object({
  referenceRange: z.tuple([seconds, seconds]).nullish(),
  offsetSeconds: z.number().nullable(), originalOffsetSeconds: z.number().nullable(),
  confidence: fraction, reliable: z.boolean(), method: z.literal('envelope'),
  featureScores: alignmentFeatureScores, warnings: z.array(z.string()),
  featureMilliseconds: seconds, correlationMilliseconds: seconds, elapsedMilliseconds: seconds,
})
const alignment = z.object({
  offset: z.number(), tempoRatio: z.number().positive(), transposeSemitones: z.number().int().nullable(),
  confidence: fraction, reliable: z.boolean(), warnings: z.array(z.string()), manualOffset: z.number().nullable(),
  method: z.enum(['pitch', 'guide', 'manual', 'envelope']).nullish(),
  offsetSeconds: z.number().nullish(), originalOffsetSeconds: z.number().nullish(),
  featureScores: alignmentFeatureScores.nullish(), automatic: alignmentDetection.nullish(),
  timeMapping: z.array(z.tuple([seconds, seconds])),
}).refine(a => (!a.reliable || a.timeMapping.length > 1) && a.timeMapping.every(([r,u], i) =>
  i === 0 || (r > a.timeMapping[i-1][0] && u > a.timeMapping[i-1][1])))
const metric = z.object({
  name: z.enum(['pitchHitRate', 'meanAbsoluteCents', 'transposedHitRate', 'matchedCoverage', 'referenceF0Coverage',
    'userF0Coverage', 'medianTimingDeviation', 'highContinuity']),
  unit: z.enum(['ratio', 'cent', 'second']), value: z.number().nonnegative().nullable(),
  validFrames: z.number().int().nonnegative(), coverage: fraction,
})
export const segment = z.object({
  type: z.enum(['sharp', 'flat', 'drift', 'interruption', 'high_drop', 'high_interruption', 'uncertain_pitch']),
  referenceStart: seconds.nullable(), referenceEnd: seconds.nullable(), userStart: seconds.nullable(),
  userEnd: seconds.nullable(), evidence: z.record(z.string(), z.number()), confidence: fraction,
})
const phrase = z.object({
  type: z.enum(['sustained', 'high']), referenceStart: seconds, referenceEnd: seconds,
  frames: z.number().int().nonnegative(), continuity: fraction, driftCents: z.number().nullable(),
  medianCents: z.number().nullable(), hitRate: fraction.nullable(),
})
const pitchScoreStatus = z.enum(['scored', 'missed', 'insufficient', 'alignment'])
const scorePoints = z.number().min(0).max(100)
const count = z.number().int().nonnegative()
const pitchScoreNote = z.object({
  start: seconds, end: seconds, status: pitchScoreStatus, referenceMidi: z.number().min(36).max(84),
  score: scorePoints.nullable(), deviationCents: z.number().nullable(),
})
const pitchScorePhrase = z.object({
  start: seconds, end: seconds, status: pitchScoreStatus, score: scorePoints.nullable(),
  totalNotes: count, scoredNotes: count, missedNotes: count, pairedFrames: count, octaveUncertainFrames: count,
  deviationCents: z.number().nullable(), driftCents: z.number().nullable(), timingMilliseconds: z.number().int().nullable(),
  notes: z.array(pitchScoreNote),
})
const pitchScore = z.object({
  version: z.literal(1), start: seconds, end: seconds, status: pitchScoreStatus, score: scorePoints.nullable(),
  coverage: fraction, totalNotes: count, scoredNotes: count, missedNotes: count, pairedFrames: count,
  scoredPhrases: count, pendingPhrases: count, phrases: z.array(pitchScorePhrase),
  elapsedMilliseconds: seconds, evidenceMilliseconds: seconds,
})
export const report = z.object({
  analysisId: id, status: z.literal('completed'), referenceMetadata: media, userMetadata: media,
  preprocessing: z.object({ sampleRate: z.number().int().positive(), method: z.string(), referenceStart: seconds,
    userStart: seconds, referenceDuration: seconds, userDuration: seconds }),
  separation: pair(separation), alignment, pitchTracks: pair(track),
  metrics: z.array(metric), segments: z.array(segment), phrases: z.array(phrase), pitchScore: pitchScore.nullish(),
  warnings: z.array(z.string()), confidence: fraction,
})

export type Role = z.infer<typeof role>
export type TrackKind = z.infer<typeof trackKind>
export type Media = z.infer<typeof media>
export type Limits = z.infer<typeof limits>
export type ClipSelection = z.infer<typeof clipSelection>
export type Selection = z.infer<typeof selection>
export type Job = z.infer<typeof job>
export type Stage = z.infer<typeof stage>
export type Report = z.infer<typeof report>
export type PitchTrack = z.infer<typeof track>
export type Segment = z.infer<typeof segment>
