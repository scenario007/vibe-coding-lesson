import {
  ArrowUpRight,
  BookOpen,
  Camera,
  Cloud,
  Flower2,
  LampDesk,
  Leaf,
  LoaderCircle,
  Moon,
  Mountain,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  const colors = {
    primary: 'bg-[#2e5748] text-white hover:bg-[#214535] shadow-[0_3px_0_#193a2e]',
    secondary: 'border border-[#dddccf] bg-white text-[#365645] hover:bg-[#f0f2e7]',
    ghost: 'text-[#5d7160] hover:bg-[#e9eee1]',
    danger: 'bg-[#f7e5df] text-[#974d3b] hover:bg-[#f0d7cd]',
  }
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${colors[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-[#e3e5d9] bg-white/90 p-5 shadow-[0_3px_14px_#2e574805] ${className}`}
    >
      {children}
    </section>
  )
}
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#51614e]">
      {label}
      <input
        {...props}
        className="min-h-11 w-full rounded-xl border border-[#dcded2] bg-white px-3.5 py-2.5 text-[#303c31] outline-none transition placeholder:text-[#a5ac9d] focus:border-[#71927b] focus:ring-3 focus:ring-[#9abb8e25] disabled:bg-[#f1f2e9]"
      />
    </label>
  )
}
export const inputClass =
  'min-h-11 w-full rounded-xl border border-[#dcded2] bg-white px-3.5 py-2.5 text-sm text-[#303c31] outline-none focus:border-[#71927b] focus:ring-3 focus:ring-[#9abb8e25]'
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-[.22em] text-[#87917b]">{eyebrow}</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#293e31]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#83907d]">{description}</p>
      </div>
      {action}
    </div>
  )
}
export function Loading({ label = '正在整理你的冒险…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-48 items-center justify-center gap-3 text-sm text-[#87927e]"
    >
      <LoaderCircle className="size-5 animate-spin" />
      {label}
    </div>
  )
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-[#eddbd0] bg-[#fff6ef] p-5 text-sm text-[#8a5540]"
    >
      <p>{message}</p>
      {retry && (
        <Button onClick={retry} variant="secondary" className="mt-3">
          再试一次
        </Button>
      )}
    </div>
  )
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="grid min-h-52 justify-items-center gap-3 rounded-2xl border border-dashed border-[#dce1d2] bg-[#fafbf6] p-8 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-[#e9efdf] text-[#68855b]">
        <Leaf className="size-5" />
      </div>
      <h3 className="font-medium text-[#4e624a]">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-[#8a9580]">{description}</p>
      {action}
    </div>
  )
}
export function Progress({ value, color = 'green' }: { value: number; color?: 'green' | 'gold' }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 overflow-hidden rounded-full bg-[#edf0e5]"
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ${color === 'gold' ? 'bg-[#d5ad64]' : 'bg-[#789a68]'}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}
export function Pill({ children, tone = 'sage' }: { children: ReactNode; tone?: string }) {
  const colors: Record<string, string> = {
    sage: 'bg-[#edf3e6] text-[#648258]',
    gold: 'bg-[#fbf2dc] text-[#aa8745]',
    rose: 'bg-[#f9e9e4] text-[#ad7768]',
    sky: 'bg-[#eaf1f5] text-[#6d93a5]',
    lavender: 'bg-[#efeaf5] text-[#937fa8]',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${colors[tone] || colors.sage}`}
    >
      {children}
    </span>
  )
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#1a2e2390] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-3xl bg-[#fafaf4] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#304933]">{title}</h2>
          <button aria-label="关闭" onClick={onClose} className="rounded-lg p-2 hover:bg-[#e6ebde]">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
const glyphs = {
  leaf: Leaf,
  star: Star,
  moon: Moon,
  book: BookOpen,
  camera: Camera,
  mountain: Mountain,
  flower: Flower2,
  cloud: Cloud,
  lamp: LampDesk,
}
export function Glyph({ name, className = 'size-5' }: { name: string; className?: string }) {
  const Icon = glyphs[name as keyof typeof glyphs] || Sparkles
  return <Icon className={className} />
}
export function Emblem({
  symbol = 'star',
  palette = 'sage',
  size = 'normal',
}: {
  symbol?: string
  palette?: string
  size?: 'normal' | 'large' | 'small'
}) {
  const colors: Record<string, string> = {
    sage: '#7f9e73',
    gold: '#d3a661',
    lavender: '#a394b7',
    rose: '#c58e7c',
    sky: '#82a7b2',
  }
  const c = colors[palette] || colors.sage
  return (
    <div
      className={`relative grid shrink-0 place-items-center rounded-[28%] border-4 border-white/70 shadow-[0_5px_18px_#4c623f18] ${size === 'large' ? 'size-32' : size === 'small' ? 'size-11' : 'size-20'}`}
      style={{ background: `linear-gradient(145deg,${c}22,${c}50)`, color: c }}
    >
      <div className="absolute inset-1.5 rounded-[25%] border border-current opacity-30" />
      <Glyph
        name={symbol}
        className={size === 'large' ? 'size-14' : size === 'small' ? 'size-5' : 'size-9'}
      />
    </div>
  )
}
export function ArrowLink() {
  return <ArrowUpRight className="size-4" />
}
