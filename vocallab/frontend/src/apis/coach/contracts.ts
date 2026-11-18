import { z } from 'zod'

const time = z.tuple([z.number().nonnegative(), z.number().nonnegative()])
const metrics = z.record(z.string(), z.number())
const strings = z.array(z.string())
const status = z.enum(['measured', 'insufficient', 'alignment', 'uncovered'])
export const songInfo = z.object({ title: z.string(), artist: z.string(), version: z.string(), notes: z.string() })
const measurement = z.object({
  status, coverage: z.number().min(0).max(1), source: z.string(), pitchSource: z.string(),
  warnings: strings, metrics,
})
const observation = z.object({
  id: z.string(), segmentId: z.string(), tool: z.string(), status, reference: measurement,
  user: measurement.nullable(), userRange: time.nullable(), comparison: metrics,
})
const difficulty = z.object({
  id: z.string(), tool: z.string(), start: z.number(), end: z.number(), title: z.string(), explanation: z.string(),
  sourceIds: strings, analysisTools: strings, manual: z.boolean(),
})
const toolRun = z.object({ tool: z.string(), status, milliseconds: z.number().nonnegative() })
const source = z.object({ id: z.string(), title: z.string(), url: z.string().url(), summary: z.string() })
const feedback = z.object({
  segmentId: z.string(), evidenceIds: strings, observation: z.string(), interpretation: z.string(),
  practice: z.object({ goal: z.string(), steps: strings, difficulty: z.string(), verification: z.string() }),
})
const coachSession = z.object({
  mode: z.enum(['ai', 'local']), song: songInfo, sources: z.array(source), researchStatus: z.string(),
  plan: z.object({
    summary: z.string(), hypotheses: z.array(z.object({ description: z.string(), locationHint: z.string(), sourceIds: strings })),
    tools: z.array(z.object({ tool: z.string(), reason: z.string() })), limitations: strings,
  }),
  difficulties: z.array(difficulty), observations: z.array(observation), runs: z.array(toolRun),
  report: z.object({ summary: z.string(), strengths: z.array(feedback), priorities: z.array(feedback), limitations: strings }).nullable(),
  history: z.array(z.object({
    question: z.string(), segmentId: z.string().nullable(), range: time.nullable(),
    answer: z.object({ answer: z.string(), evidenceIds: strings }), observations: z.array(observation), runs: z.array(toolRun),
  })),
  warnings: strings, model: z.string().nullable(), requestedTools: strings, highThreshold: z.number().nullable(),
})
export const coachView = z.object({
  session: coachSession.nullable(), stale: z.boolean(), aiAvailable: z.boolean(), searchAvailable: z.boolean(),
  tools: z.array(z.object({ id: z.string(), label: z.string(), minimumSeconds: z.number(), description: z.string() })),
})

export type SongInfo = z.infer<typeof songInfo>
export type CoachView = z.infer<typeof coachView>
export type Difficulty = z.infer<typeof difficulty>
export type Observation = z.infer<typeof observation>
export type Feedback = z.infer<typeof feedback>
export type ResearchSource = z.infer<typeof source>
