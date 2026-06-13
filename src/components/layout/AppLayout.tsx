import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { LogOut, Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { UserRole } from '@/types'
import Sidebar from '@/components/layout/Sidebar'

const ROLE_LABELS: Record<UserRole, string> = {
  consultant: '顾问',
  coach: '教练',
  member: '会员',
  finance: '财务',
}

export default function AppLayout() {
  const { currentUser, members, login, logout, initDemoData } = useGymStore()

  useEffect(() => {
    if (members.length === 0) {
      initDemoData()
    }
  }, [members.length, initDemoData])

  const loginUsers = useGymStore.getState().members.length > 0
    ? useGymStore.getState().members
    : members

  return (
    <div className="flex h-screen overflow-hidden font-body bg-warm-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-warm-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Dumbbell className="w-5 h-5 text-emerald-950" />
            <span className="text-sm text-dark/60 hidden sm:inline">私教排课与账务管理系统</span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-950 flex items-center justify-center text-white text-sm font-medium">
                    {currentUser.name.slice(-1)}
                  </div>
                  <span className="text-sm font-medium text-dark">{currentUser.name}</span>
                  <span className="badge-gold">{ROLE_LABELS[currentUser.role]}</span>
                </div>
                <button
                  onClick={logout}
                  className="ml-2 p-1.5 rounded-lg text-dark/40 hover:text-coral hover:bg-coral/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-dark/40">切换身份：</span>
                <select
                  className={cn(
                    'text-sm rounded-lg border border-warm-200 bg-warm-50 px-3 py-1.5',
                    'text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold',
                    'cursor-pointer'
                  )}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) login(e.target.value)
                  }}
                >
                  <option value="" disabled>选择用户</option>
                  {loginUsers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}（{ROLE_LABELS[m.role]}）
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
