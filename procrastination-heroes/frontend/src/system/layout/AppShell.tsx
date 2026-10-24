import { Glyph, Progress } from '@/components/ui'
import { refreshProgress, usePlayer } from '@/system/stores/player'
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Coins,
  House,
  LayoutDashboard,
  Leaf,
  Map,
  Menu,
  PanelLeftClose,
  ScrollText,
  Settings2,
  Sparkles,
  Store,
  Timer,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
const links = [
  ['/dashboard', '协会大厅', LayoutDashboard],
  ['/quests', '任务大厅', ScrollText],
  ['/focus', '专注营地', Timer],
  ['/map', '冒险地图', Map],
  ['/base', '我的据点', House],
  ['/shop', '补给商店', Store],
  ['/growth', '成长档案', ChartNoAxesCombined],
  ['/profile', '勇者资料', Settings2],
] as const
export function AppShell() {
  const { user, progress } = usePlayer()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])
  useEffect(() => {
    void refreshProgress()
  }, [])
  const level = 1 + Math.floor((progress?.experience || 0) / 100)
  return (
    <div className="min-h-screen bg-[#f6f5ef] text-[#344637]">
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="收起导航"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-[#e0e4d6] bg-[#f9faf4] px-4 py-7 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full max-lg:hidden'}`}
      >
        <Link to="/dashboard" className="mb-10 flex items-center gap-2.5 px-2">
          <span className="grid size-10 place-items-center rounded-xl bg-[#2e5748] text-[#edf3db]">
            <Leaf className="size-6" />
          </span>
          <span>
            <span className="block font-serif text-lg font-bold tracking-wide">拖延勇者协会</span>
            <span className="block text-[8px] tracking-[.21em] text-[#9aab8b]">
              THE LITTLE HEROES GUILD
            </span>
          </span>
        </Link>
        <p className="mb-3 px-3 text-[9px] font-semibold tracking-[.22em] text-[#a6b098]">
          我的冒险 · MY ADVENTURE
        </p>
        <nav className="space-y-1">
          {links.map(([path, label, Icon], i) => (
            <div key={path}>
              {i === 4 && <div className="mx-3 my-5 border-t border-[#e4e8db]" />}
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] transition ${isActive ? 'bg-[#e4ecdc] font-semibold text-[#3c633b]' : 'text-[#84907a] hover:bg-[#edf1e6] hover:text-[#496a43]'}`
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
          <div className="rounded-xl border border-[#e1e6d7] bg-[#f0f4e7] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#7e9467]">
              <Sparkles className="size-3.5" />
              协会小纸条
            </div>
            <p className="text-[11px] leading-6 text-[#91a07f]">
              不必追赶别人的进度，
              <br />
              你的小小进展，也值得记录。
            </p>
          </div>
          <Link to="/profile" className="mt-5 flex items-center gap-3 px-2">
            <span className="grid size-9 place-items-center rounded-full bg-[#e4ead7] text-[#748e5b]">
              <Glyph name={user?.avatar || 'leaf'} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{user?.nickname}</span>
              <span className="text-[10px] text-[#9aa68a]">Lv.{level} · 正在慢慢成长</span>
            </span>
            <PanelLeftClose className="size-4 text-[#a1ad94]" />
          </Link>
        </div>
      </aside>
      <div className="lg:ml-60">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-[#e4e5da] bg-[#f8f8f1ee] px-5 backdrop-blur-md lg:px-9">
          <div className="flex items-center gap-3">
            <button className="p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="打开导航">
              <Menu className="size-5" />
            </button>
            <span className="hidden text-xs text-[#a2ac94] sm:block">我的冒险</span>
            <span className="hidden text-[#c2c9b6] sm:block">/</span>
            <span className="text-xs font-medium text-[#63785a]">
              {links.find(([p]) => location.pathname.startsWith(p))?.[1] || '任务工作台'}
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden w-32 md:block">
              <div className="mb-1 flex justify-between text-[9px] text-[#8e9e7c]">
                <span>Lv.{level} 勇者</span>
                <span>{(progress?.experience || 0) % 100} / 100 XP</span>
              </div>
              <Progress value={(progress?.experience || 0) % 100} />
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#e9dfbd] bg-[#faf4e2] px-3 py-1.5 text-xs font-semibold text-[#b09150]">
              <Coins className="size-3.5" />
              {progress?.coins ?? '—'}
              <span className="hidden text-[10px] font-normal sm:inline">冒险币</span>
            </div>
            <Link
              to="/quests/new"
              className="flex items-center gap-1 text-xs font-medium text-[#4e6d43]"
            >
              新的冒险
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1450px] p-5 pb-12 sm:p-7 lg:px-9 lg:py-8">
          <Outlet />
        </main>
        <footer className="px-9 pb-6 text-[10px] tracking-wide text-[#acb39f]">
          LITTLE BY LITTLE, A LITTLE BECOMES A LOT.{' '}
          <span className="float-right hidden sm:inline">今天先动一下 🌿</span>
        </footer>
      </div>
    </div>
  )
}
