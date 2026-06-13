import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Package,
  ArrowRightLeft,
  RotateCcw,
  Calendar,
  CalendarDays,
  BarChart3,
  BookOpen,
  CreditCard,
  FileText,
  Lock,
  Scale,
  FlaskConical,
  Award,
  Building2,
  Store,
  Shield,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
}

interface NavGroup {
  key: string
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: '总览',
    items: [{ path: '/', label: '总览仪表盘', icon: LayoutDashboard }],
  },
  {
    key: 'consultant',
    label: '顾问端',
    items: [
      { path: '/consultant/members', label: '会员管理', icon: Users },
      { path: '/consultant/packages', label: '课包管理', icon: Package },
      { path: '/consultant/transfers', label: '转让审批', icon: ArrowRightLeft },
      { path: '/consultant/refunds', label: '退课退款', icon: RotateCcw },
    ],
  },
  {
    key: 'coach',
    label: '教练端',
    items: [
      { path: '/coach/schedule', label: '排班管理', icon: Calendar },
      { path: '/coach/timetable', label: '课表视图', icon: CalendarDays },
      { path: '/coach/stats', label: '课时统计', icon: BarChart3 },
    ],
  },
  {
    key: 'member',
    label: '会员端',
    items: [
      { path: '/member/book', label: '预约中心', icon: BookOpen },
      { path: '/member/packages', label: '我的课包', icon: CreditCard },
    ],
  },
  {
    key: 'finance',
    label: '财务端',
    items: [
      { path: '/finance/transactions', label: '流水账务', icon: FileText },
      { path: '/finance/closing', label: '月末关账', icon: Lock },
      { path: '/finance/reconciliation', label: '对账差异', icon: Scale },
    ],
  },
  {
    key: 'simulator',
    label: '模拟器',
    items: [{ path: '/simulator', label: '扣课模拟器', icon: FlaskConical }],
  },
  {
    key: 'admin',
    label: '系统管理',
    items: [
      { path: '/admin/levels', label: '课程等级', icon: Award },
      { path: '/admin/venues', label: '场地容量', icon: Building2 },
      { path: '/admin/stores', label: '跨门店配置', icon: Store },
      { path: '/admin/audit', label: '操作审计', icon: Shield },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ 'overview': false, 'simulator': false })

  const toggleGroup = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="w-64 h-screen bg-emerald-950 flex flex-col overflow-y-auto shrink-0">
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="heading-display text-xl font-bold text-gold tracking-wide">GYM PT</h1>
        <p className="text-white/40 text-xs mt-1 font-body">私教排课与账务系统</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_GROUPS.map(group => {
          const isGroupCollapsed = collapsed[group.key] ?? true
          const hasActiveItem = group.items.some(item => isActive(item.path))

          return (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className={cn(
                  'flex items-center justify-between w-full px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors',
                  hasActiveItem ? 'text-gold' : 'text-white/40 hover:text-white/60'
                )}
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    isGroupCollapsed && '-rotate-90'
                  )}
                />
              </button>

              {!isGroupCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon
                    const active = isActive(item.path)

                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={cn(
                          'sidebar-link w-full',
                          active ? 'sidebar-link-active' : 'sidebar-link-inactive'
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-white/20 text-xs text-center font-body">v1.0.0</p>
      </div>
    </aside>
  )
}
