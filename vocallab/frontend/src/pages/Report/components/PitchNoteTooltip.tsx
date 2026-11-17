import { noteLabel } from '../functions/timeline'

export function PitchNoteTooltip({ midi, x, y }: { midi: number; x: number; y: number }) {
  return <div role="tooltip"
    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-canvas px-2 py-1 font-mono text-xs font-semibold text-ink shadow-lg"
    style={{ left: `clamp(1.5rem, ${x}%, calc(100% - 1.5rem))`, top: `calc(${y}% - 7px)` }}>
    {noteLabel(midi)}
  </div>
}
