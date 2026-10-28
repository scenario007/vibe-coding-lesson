import { ErrorState, Loading } from '@/components/ui'
import Auth from '@/pages/Auth'
import Base from '@/pages/Base'
import Dashboard from '@/pages/Dashboard'
import Focus from '@/pages/Focus'
import Growth from '@/pages/Growth'
import Profile from '@/pages/Profile'
import Quests from '@/pages/Quests'
import QuestWorkbench from '@/pages/QuestWorkbench'
import Shop from '@/pages/Shop'
import { AppShell } from '@/system/layout/AppShell'
import { bootPlayer, usePlayer } from '@/system/stores/player'
import { createBrowserRouter, Link, Navigate, Outlet, useLocation } from 'react-router-dom'
function SessionGate() {
  const { status, user, error } = usePlayer()
  const location = useLocation()
  if (status === 'loading') return <Loading label="正在打开你的冒险存档…" />
  if (status === 'error')
    return (
      <div className="mx-auto mt-20 max-w-lg p-5">
        <ErrorState message={error} retry={() => void bootPlayer()} />
      </div>
    )
  if (!user)
    return (
      <Navigate
        to={'/auth?next=' + encodeURIComponent(location.pathname + location.search)}
        replace
      />
    )
  return <Outlet />
}
export const router = createBrowserRouter([
  { path: '/auth', element: <Auth /> },
  {
    element: <SessionGate />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/quests', element: <Quests /> },
          { path: '/quests/new', element: <QuestWorkbench /> },
          { path: '/quests/:id', element: <QuestWorkbench /> },
          { path: '/focus', element: <Focus /> },
          { path: '/base', element: <Base /> },
          { path: '/shop', element: <Shop /> },
          { path: '/growth', element: <Growth /> },
          { path: '/profile', element: <Profile /> },
          {
            path: '*',
            element: (
              <div className="py-20 text-center text-[#716449]">
                这条小路还没有开辟。
                <Link className="ml-3 underline" to="/dashboard">
                  回到协会大厅
                </Link>
              </div>
            ),
          },
        ],
      },
    ],
  },
])
