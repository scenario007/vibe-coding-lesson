import { RewardIllustration } from './RewardIllustration'
import { FurnitureIllustration } from './FurnitureIllustration'
import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
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
    primary:
      'border-2 border-[#332820] bg-[#a94732] text-[#fff8e7] hover:bg-[#8c382b] shadow-[3px_3px_0_#332820] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#332820]',
    secondary:
      'border-2 border-[#57472f] bg-[#fff8e7] text-[#332820] hover:bg-[#eadcc1] shadow-[2px_2px_0_#6b573d]',
    ghost: 'text-[#665d3e] hover:bg-[#eadcc1]',
    danger: 'bg-[#eadcc1] text-[#665d3e] hover:bg-[#cabb9e]',
  }
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px_9px_4px_7px] px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${colors[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`relative rounded-[4px_12px_5px_9px] border-[1.5px] border-[#a38c65] bg-[#fff8e7] p-5 shadow-[3px_4px_0_#79604425] ${className}`}
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
    <label className="grid gap-2 text-sm font-medium text-[#665d3e]">
      {label}
      <input
        {...props}
        className="min-h-11 w-full rounded-md border-[1.5px] border-[#a38c65] bg-white px-3.5 py-2.5 text-[#332820] outline-none transition placeholder:text-[#8a785d] focus:border-[#716449] focus:ring-3 focus:ring-[#9abb8e25] disabled:bg-[#eadcc1]"
      />
    </label>
  )
}
export const inputClass =
  'min-h-11 w-full rounded-md border-[1.5px] border-[#a38c65] bg-white px-3.5 py-2.5 text-sm text-[#332820] outline-none focus:border-[#716449] focus:ring-3 focus:ring-[#9abb8e25]'
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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b-2 border-dashed border-[#b6a17b] pb-5">
      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.22em] text-[#a94732]">{eyebrow}</p>
        <h1 className="font-serif text-3xl font-black tracking-wide text-[#332820] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#716449]">{description}</p>
      </div>
      {action}
    </div>
  )
}
export function Loading({ label = '正在整理你的冒险…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-48 items-center justify-center gap-3 text-sm text-[#716449]"
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
      className="rounded-2xl border border-[#cabb9e] bg-[#fff8e7] p-5 text-sm text-[#665d3e]"
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
    <div className="grid min-h-52 justify-items-center gap-3 rounded-2xl border border-dashed border-[#cabb9e] bg-[#fff8e7] p-8 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-[#eadcc1] text-[#716449]">
        <Leaf className="size-5" />
      </div>
      <h3 className="font-medium text-[#665d3e]">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-[#716449]">{description}</p>
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
      className="h-2 overflow-hidden rounded-full bg-[#eadcc1]"
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ${color === 'gold' ? 'bg-[#8a785d]' : 'bg-[#716449]'}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}
export function Pill({ children, tone = 'sage' }: { children: ReactNode; tone?: string }) {
  const colors: Record<string, string> = {
    sage: 'bg-[#eadcc1] text-[#665d3e]',
    gold: 'bg-[#eadcc1] text-[#716449]',
    rose: 'bg-[#eadcc1] text-[#716449]',
    sky: 'bg-[#eadcc1] text-[#716449]',
    lavender: 'bg-[#eadcc1] text-[#716449]',
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
  const panel = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  }, [onClose])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close.current()
        return
      }
      if (event.key !== 'Tab') return
      const nodes = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        ) || [],
      )
      const first = nodes[0],
        last = nodes[nodes.length - 1]
      if (!first || !last) {
        event.preventDefault()
        return
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel.current)
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', key)
      previous?.focus()
    }
  }, [])
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#1a2e2390] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-3xl bg-[#fff8e7] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#332820]">{title}</h2>
          <button aria-label="关闭" onClick={onClose} className="rounded-lg p-2 hover:bg-[#eadcc1]">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
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
  itemId,
}: {
  symbol?: string
  palette?: string
  size?: 'normal' | 'large' | 'small'
  itemId?: string
}) {
  return (
    <div
      className={`relative grid shrink-0 place-items-center ${size === 'large' ? 'size-32' : size === 'small' ? 'size-11' : 'size-20'}`}
    >
      {itemId ? (
        <FurnitureIllustration itemId={itemId} />
      ) : (
        <RewardIllustration symbol={symbol} palette={palette} compact={size === 'small'} />
      )}
    </div>
  )
}
export function ArrowLink() {
  return <ArrowUpRight className="size-4" />
}
