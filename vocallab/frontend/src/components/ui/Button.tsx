import type { ButtonHTMLAttributes } from 'react'

export function Button({ className = '', variant = 'secondary', ...props }:
ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'text' }) {
  const variants = {
    primary: 'bg-[#c1b2ff] text-[#1f1539] hover:bg-[#d1c5ff] disabled:bg-[#3a3251] disabled:text-[#b5a9cf]',
    secondary: 'border border-line bg-panel text-ink hover:bg-raised disabled:opacity-40',
    text: 'text-muted hover:text-ink hover:bg-raised disabled:opacity-40',
  }
  return <button type="button" className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`} {...props}/>
}
