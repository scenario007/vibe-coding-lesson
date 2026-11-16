import { z } from 'zod'

export const lyricsTrack = z.object({
  id: z.number().int().positive(),
  trackName: z.string(),
  artistName: z.string(),
  albumName: z.string().nullable(),
  duration: z.number().nonnegative(),
  hasSyncedLyrics: z.boolean(),
})
export const lyricsResponse = z.object({
  id: z.number().int().positive(),
  syncedLyrics: z.string().nullable(),
})
export type LyricsTrack = z.infer<typeof lyricsTrack>
