import { useMemo } from 'react'
import {
  CalendarCheck,
  AlertTriangle,
  Clock,
  Lock,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { BookingStatus, LeaveRecord } from '@/types'

function StatusBadge({ status }: { status: BookingStatus }) {
  const config: Record<BookingStatus, { label: string; className: string }> = {
    confirmed: { label: '已确认', className: 'bg-emerald-700/20 text-emerald-400' },
    waitlisted: { label: '候补', className: 'bg-gold/20 text-gold' },
    cancelled: { label: '已取消', className: 'bg-white/10 text-white/40' },
    completed: { label: '已完成', className: 'bg-emerald-700/30 text-emerald-300' },
    no_show: { label: '未到', className: 'bg-coral/20 text-coral' },
  }
  const c = config[status]
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', c.className)}>
      {c.label}
    </span>
  )
}

export default function Dashboard() {
  const {
    bookings, members, coaches, courses, packages, packageTypes,
    leaveRecords, transferRequests, refundRequests, closingSnapshots,
    getPackageBalance, approveLeave, rejectLeave, approveTransfer,
    rejectTransfer, approveRefund,
  } = useGymStore()

  const todayStr = new Date().toISOString().slice(0, 10)

  const todayBookings = useMemo(
    () => bookings.filter(b => b.datetime.startsWith(todayStr)),
    [bookings, todayStr]
  )

  const pendingLeaves = useMemo(
    () => leaveRecords.filter((l: LeaveRecord) => l.status === 'pending'),
    [leaveRecords]
  )
  const pendingTransfers = useMemo(
    () => transferRequests.filter(t => t.status === 'pending'),
    [transferRequests]
  )
  const pendingRefunds = useMemo(
    () => refundRequests.filter(r => r.status === 'pending'),
    [refundRequests]
  )

  const totalPending = pendingLeaves.length + pendingTransfers.length + pendingRefunds.length

  const expiringPackages = useMemo(() => {
    const now = new Date()
    const threshold = new Date()
    threshold.setDate(threshold.getDate() + 30)
    return packages.filter(p => {
      if (p.status !== 'active') return false
      const exp = new Date(p.expireDate)
      return exp >= now && exp <= threshold
    })
  }, [packages])

  const closingStatus = useMemo(() => {
    if (closingSnapshots.length === 0) return '未关账'
    const latest = closingSnapshots[closingSnapshots.length - 1]
    return latest.period
  }, [closingSnapshots])

  const memberMap = useMemo(() => {
    const m: Record<string, string> = {}
    members.forEach(mb => { m[mb.id] = mb.name })
    return m
  }, [members])

  const coachMap = useMemo(() => {
    const m: Record<string, string> = {}
    coaches.forEach(c => { m[c.id] = c.name })
    return m
  }, [coaches])

  const courseMap = useMemo(() => {
    const m: Record<string, string> = {}
    courses.forEach(c => { m[c.id] = c.name })
    return m
  }, [courses])

  const recentBookings = useMemo(
    () => [...bookings].sort((a, b) => b.datetime.localeCompare(a.datetime)).slice(0, 10),
    [bookings]
  )

  const metrics = [
    {
      icon: CalendarCheck,
      label: '今日预约数',
      value: todayBookings.length,
      trend: '+2 vs 昨日',
      trendUp: true,
    },
    {
      icon: AlertTriangle,
      label: '待处理异常',
      value: totalPending,
      trend: `${pendingLeaves.length}假 ${pendingTransfers.length}转 ${pendingRefunds.length}退`,
      trendUp: false,
    },
    {
      icon: Clock,
      label: '课包即将到期',
      value: expiringPackages.length,
      trend: '30天内到期',
      trendUp: false,
    },
    {
      icon: Lock,
      label: '关账状态',
      value: closingStatus,
      trend: closingSnapshots.length > 0 ? `共${closingSnapshots.length}期` : '暂无记录',
      trendUp: closingSnapshots.length > 0,
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="heading-display text-2xl font-bold text-dark">总览仪表盘</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon
          const isTextValue = typeof m.value === 'string'
          return (
            <div key={m.label} className="card-dark p-5">
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-5 h-5 text-gold" />
                <span className={cn(
                  'text-xs flex items-center gap-1',
                  m.trendUp ? 'text-emerald-400' : 'text-white/40'
                )}>
                  {m.trendUp && <TrendingUp className="w-3 h-3" />}
                  {m.trend}
                </span>
              </div>
              <div className={cn(
                'text-3xl font-bold font-display',
                isTextValue ? 'text-lg text-white/80' : 'text-gold'
              )}>
                {m.value}
              </div>
              <div className="text-sm text-white/50 mt-1">{m.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-dark p-5">
          <h2 className="text-lg font-semibold text-white mb-4">待办事项</h2>
          <div className="space-y-3">
            {pendingLeaves.length === 0 && pendingTransfers.length === 0 && pendingRefunds.length === 0 && (
              <p className="text-white/40 text-sm">暂无待办事项</p>
            )}
            {pendingLeaves.map(l => {
              const coachName = coachMap[l.coachId] ?? l.coachId
              return (
                <div key={l.id} className="flex items-center justify-between bg-dark-light rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">
                      <span className="text-gold">请假申请</span> - {coachName}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {l.startDate} ~ {l.endDate} | {l.reason}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => approveLeave(l.id)}
                      className="p-1.5 rounded-lg bg-emerald-700/20 text-emerald-400 hover:bg-emerald-700/40 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => rejectLeave(l.id)}
                      className="p-1.5 rounded-lg bg-coral/20 text-coral hover:bg-coral/40 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
            {pendingTransfers.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-dark-light rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">
                    <span className="text-gold">转让申请</span> - {memberMap[t.fromMemberId] ?? t.fromMemberId} → {memberMap[t.toMemberId] ?? t.toMemberId}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">{t.reason}</div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => approveTransfer(t.id)}
                    className="p-1.5 rounded-lg bg-emerald-700/20 text-emerald-400 hover:bg-emerald-700/40 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => rejectTransfer(t.id)}
                    className="p-1.5 rounded-lg bg-coral/20 text-coral hover:bg-coral/40 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {pendingRefunds.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-dark-light rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">
                    <span className="text-gold">退款申请</span> - {memberMap[r.memberId] ?? r.memberId}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">退款金额: ¥{r.refundAmount}</div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => approveRefund(r.id)}
                    className="p-1.5 rounded-lg bg-emerald-700/20 text-emerald-400 hover:bg-emerald-700/40 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-dark p-5">
          <h2 className="text-lg font-semibold text-white mb-4">近期预约</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/10">
                  <th className="text-left pb-3 font-medium">会员</th>
                  <th className="text-left pb-3 font-medium">教练</th>
                  <th className="text-left pb-3 font-medium">课程</th>
                  <th className="text-left pb-3 font-medium">时间</th>
                  <th className="text-left pb-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentBookings.map(b => (
                  <tr key={b.id} className="text-white/80">
                    <td className="py-2.5">{memberMap[b.memberId] ?? b.memberId}</td>
                    <td className="py-2.5">{coachMap[b.coachId] ?? b.coachId}</td>
                    <td className="py-2.5">{courseMap[b.courseId] ?? b.courseId}</td>
                    <td className="py-2.5 text-white/50">{b.datetime.replace('T', ' ')}</td>
                    <td className="py-2.5"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
