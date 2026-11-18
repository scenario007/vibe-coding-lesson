import { noteLabel } from '../functions/timeline'

export function PitchNoteTooltip({ notes, x, y, emphasis = false }: {
  notes: { midi: number; color?: string }[]; x: number; y: number; emphasis?: boolean
}) {
  return <div role="tooltip"
    className={`pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full gap-2 rounded-md border border-line bg-canvas px-2 py-1 font-mono font-semibold text-ink shadow-lg ${emphasis ? 'text-sm' : 'text-xs'}`}
    style={{ left: `clamp(${notes.length === 2 ? 3 : 1.5}rem, ${x}%, calc(100% - ${notes.length === 2 ? 3 : 1.5}rem))`, top: `calc(${y}% - 7px)` }}>
    {notes.map(({ midi, color }, index) => <span key={index} style={{ color }}>{noteLabel(midi)}</span>)}
  </div>
}
