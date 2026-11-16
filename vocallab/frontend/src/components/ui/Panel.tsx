import type { HTMLAttributes } from 'react'

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rounded-2xl border border-line bg-panel ${className}`} {...props}/>
}
