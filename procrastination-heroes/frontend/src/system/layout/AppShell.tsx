import { UsageLedger } from './UsageLedger'
import { Glyph } from '@/components/ui'
import { usePlayer } from '@/system/stores/player'
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  LayoutDashboard,
  Leaf,
  Menu,
  PanelLeftClose,
  ScrollText,
  Settings2,
  Sparkles,
  Timer,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
const links = [
  ['/dashboard', '协会大厅', LayoutDashboard],
  ['/quests', '委托公告板', ScrollText],
  ['/focus', '史莱姆专注室', Timer],
  ['/growth', '勇者手账', ChartNoAxesCombined],
  ['/profile', '勇者资料', Settings2],
] as const
export function AppShell() {
  const { user } = usePlayer()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])
  return (
    <div className="guild-paper min-h-screen text-[#332820]">
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="收起导航"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r-[3px] border-[#251f19] bg-[#373027] px-4 py-7 text-[#f6e7c9] transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full max-lg:hidden'}`}
      >
        <Link to="/dashboard" className="mb-10 flex items-center gap-2.5 px-2">
          <span className="grid size-10 place-items-center rotate-[-7deg] rounded-sm border-2 border-[#ecd8b0] bg-[#a94732] text-[#fff8e7]">
            <Leaf className="size-6" />
          </span>
          <span>
            <span className="block font-serif text-lg font-bold tracking-wide">拖延勇者协会</span>
            <span className="block text-[8px] tracking-[.21em] text-[#9aab8b]">
              WORLD’S OKAYEST HEROES
            </span>
          </span>
        </Link>
        <p className="mb-3 px-3 text-[9px] font-semibold tracking-[.22em] text-[#a6b098]">
          公会事务 / GUILD AFFAIRS
        </p>
        <nav className="space-y-1">
          {links.map(([path, label, Icon], i) => (
            <div key={path}>
              {i === 4 && <div className="mx-3 my-5 border-t border-[#e4e8db]" />}
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] transition ${isActive ? 'rotate-[-1deg] border-l-4 border-[#d09551] bg-[#f4e8cd] font-bold text-[#332820]' : 'text-[#c8b895] hover:bg-[#594c39] hover:text-[#fff8e7]'}`
                }
              >
                <Icon className="size-[18px]" />
                {label}
                {i === 0 && <span className="ml-auto size-1.5 rounded-full bg-[#83a66c]" />}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="mt-auto pt-7">
          <div className="rotate-[1deg] rounded-sm border border-[#a38c65] bg-[#eadcc1] p-4 text-[#332820]">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#a94732]">
              <Sparkles className="size-3.5" />
              协会小纸条
            </div>
            <p className="text-[11px] leading-6 text-[#665d3e]">
              协会守则第 01 条：
              <br />
              可以菜，但今天动一下。
            </p>
          </div>
          <Link to="/profile" className="mt-5 flex items-center gap-3 px-2">
            <span className="grid size-9 place-items-center rounded-full bg-[#e4ead7] text-[#748e5b]">
              <Glyph name={user?.avatar || 'leaf'} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{user?.nickname}</span>
              <span className="text-[10px] text-[#9aa68a]">正在慢慢成长</span>
            </span>
            <PanelLeftClose className="size-4 text-[#a1ad94]" />
          </Link>
        </div>
      </aside>
      <div className="lg:ml-60">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-[#b6a17b] bg-[#f4e8cdee] px-5 backdrop-blur-md lg:px-9">
          <div className="flex items-center gap-3">
            <button className="p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="打开导航">
              <Menu className="size-5" />
            </button>
            <span className="hidden text-xs text-[#8a785d] sm:block">协会今日营业</span>
            <span className="hidden text-[#c2c9b6] sm:block">/</span>
            <span className="text-xs font-medium text-[#665d3e]">
              {links.find(([p]) => location.pathname.startsWith(p))?.[1] || '任务工作台'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <UsageLedger />
            <Link
              to="/quests/new"
              className="flex items-center gap-1 text-xs font-medium text-[#4e6d43]"
            >
              领取委托
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1450px] p-5 pb-12 sm:p-7 lg:px-9 lg:py-8">
          <Outlet />
        </main>
        <footer className="px-9 pb-6 text-[10px] tracking-wide text-[#acb39f]">
          拖延勇者协会 · 今日无人成为传说，但有人打开了文档。{' '}
          <span className="float-right hidden sm:inline">公会正常营业中</span>
        </footer>
      </div>
    </div>
  )
}
