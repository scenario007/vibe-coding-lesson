export type LyricLine = { time: number; text: string }

export function parseLrc(raw: string): LyricLine[] {
  const offset = (Number(raw.match(/^\s*\[offset:([+-]?\d{1,7})\]/im)?.[1]) || 0) / 1000
  const timestamp = /^\[(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?\]/
  const lines = new Map<number, string[]>()
  for (const row of raw.split(/\r?\n/)) {
    let rest = row.trim()
    const times = []
    let tag = rest.match(timestamp)
    while (tag) {
      const seconds = Number(tag[1]) * 60 + Number(tag[2]) + Number('0.' + (tag[3] ?? '0'))
      times.push(Math.round((seconds - offset) * 1000) / 1000)
      rest = rest.slice(tag[0].length).trimStart()
      tag = rest.match(timestamp)
    }
    const text = rest.replace(/<\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?>/g, '').trim()
    for (const time of times) {
      const existing = lines.get(time) ?? []
      if (!existing.includes(text)) lines.set(time, [...existing, text])
    }
  }
  return Array.from(lines, ([time, parts]) => ({ time, text: parts.filter(Boolean).join(' / ') }))
    .sort((a, b) => a.time - b.time)
}
