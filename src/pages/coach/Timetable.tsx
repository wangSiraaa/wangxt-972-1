import { useState, useMemo } from 'react'
import { Calendar, Ban, UserX, RefreshCw, Info, Gift, Briefcase, Heart, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import { isCoachOnLeave, getBookingDeductionExplanation, getBookingRestrictionReasons } from '@/engines/scheduleEngine'
import { getBookingTransactions, getTransactionSourceLabel } from '@/engines/transactionEngine'
import type { Booking, CourseLevel, Package, Transaction } from '@/types'

const LEVEL_COLORS: Record<string, string> = {
  lv1: '#4ADE80',
  lv2: '#FBBF24',
  lv3: '#F87171',
}

const STATUS_LABELS: Record<Booking['status'], { label: string; cls: string }> = {
  confirmed: { label: '已确认', cls: 'bg-emerald-700/20 text-emerald-400' },
  waitlisted: { label: '候补', cls: 'bg-gold/15 text-gold' },
  cancelled: { label: '已取消', cls: 'bg-coral/15 text-coral' },
  completed: { label: '已完成', cls: 'bg-white/10 text-white/50' },
  no_show: { label: '未到', cls: 'bg-coral/15 text-coral' },
}

const PACKAGE_TYPE_ICONS: Record<string, any> = {
  '赠课': Gift,
  '补偿课时': Heart,
  '企业团课': Briefcase,
  '购买课包': ShoppingBag,
}

function BookingDetailCard({ booking, packages, transactions, courses, closingSnapshots, coaches }: {
  booking: Booking
  packages: Package[]
  transactions: Transaction[]
  courses: { id: string; levelId: string; storeId: string; name: string }[]
  closingSnapshots: any[]
  coaches: { id: string; name: string }[]
}) {
  const [expanded, setExpanded] = useState(false)

  const bookingTxs = getBookingTransactions(booking.id, transactions)
  const deductionExplanations = getBookingDeductionExplanation(booking, packages, bookingTxs)
  const restrictionReasons = getBookingRestrictionReasons(booking, closingSnapshots, packages, courses)

  const originalCoach = booking.originalCoachId ? coaches.find(c => c.id === booking.originalCoachId) : null
  const currentCoach = coaches.find(c => c.id === booking.coachId)

  return (
    <div
      className={cn(
        'card-dark overflow-hidden transition-all',
        booking.status === 'cancelled' && 'border-coral/50 opacity-80'
      )}
    >
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="text-center min-w-[60px]">
          <div className={cn('text-lg font-semibold', booking.status === 'cancelled' ? 'line-through text-white/30' : 'text-white')}>
            {booking.datetime.slice(11, 16)}
          </div>
          <div className="text-white/30 text-xs">{booking.duration}分钟</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-medium text-sm', booking.status === 'cancelled' ? 'line-through text-white/30' : 'text-white')}>
              {courses.find(c => c.id === booking.courseId)?.name ?? '未知课程'}
            </span>
            {booking.isSubstituted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                <UserX className="w-3 h-3" />
                代课
              </span>
            )}
          </div>
          <div className="text-white/40 text-xs mt-1">
            会员: {booking.memberId}
            {booking.isSubstituted && originalCoach && (
              <span className="ml-2 text-purple-400">
                原教练: {originalCoach.name} → 现: {currentCoach?.name}
              </span>
            )}
          </div>
          {restrictionReasons.length > 0 && (
            <div className="flex items-center gap-1 mt-1 text-coral text-xs">
              <Ban className="w-3 h-3" />
              <span>{restrictionReasons[0]}</span>
            </div>
          )}
        </div>
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_LABELS[booking.status].cls)}>
          {STATUS_LABELS[booking.status].label}
        </span>
        <RefreshCw className={cn('w-4 h-4 text-white/30 transition-transform', expanded && 'rotate-180')} />
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4 bg-white/[0.02]">
          {booking.isSubstituted && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-white/60 flex items-center gap-1">
                <UserX className="w-3 h-3 text-purple-400" />
                代课信息
              </div>
              <div className="text-sm text-white/80">
                原教练: <span className="text-white/40">{originalCoach?.name ?? '未知'}</span>
                {' → '}
                现教练: <span className="text-purple-400">{currentCoach?.name ?? '未知'}</span>
              </div>
            </div>
          )}

          {deductionExplanations.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-white/60 flex items-center gap-1">
                <Info className="w-3 h-3 text-gold" />
                扣课明细
              </div>
              <div className="space-y-1">
                {deductionExplanations.map((exp, idx) => {
                  const IconComp = PACKAGE_TYPE_ICONS[exp.packageType] ?? ShoppingBag
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white/5 px-3 py-2 rounded">
                      <div className="flex items-center gap-2">
                        <IconComp className="w-3 h-3 text-gold" />
                        <span className="text-white/70">{exp.packageName}</span>
                        <span className="text-white/30">({exp.packageType})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={exp.deductionAmount < 0 ? 'text-coral' : 'text-emerald-400'}>
                          {exp.deductionAmount > 0 ? '+' : ''}{exp.deductionAmount}
                        </span>
                        <span className="text-white/40">{exp.reason}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {restrictionReasons.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-white/60 flex items-center gap-1">
                <Ban className="w-3 h-3 text-coral" />
                限制原因
              </div>
              <div className="space-y-1">
                {restrictionReasons.map((reason, idx) => (
                  <div key={idx} className="text-xs text-coral/80 bg-coral/10 px-3 py-1.5 rounded">
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {bookingTxs.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-white/60">流水记录</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {bookingTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-xs bg-white/5 px-3 py-1.5 rounded">
                    <span className="text-white/50">{tx.createdAt.slice(5, 16)}</span>
                    <span className="text-white/40">{getTransactionSourceLabel(tx.source as any)}</span>
                    <span className={tx.amount < 0 ? 'text-coral' : 'text-emerald-400'}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Timetable() {
  const { coaches, bookings, courses, courseLevels, members, schedules, leaveRecords, packages, transactions, closingSnapshots } = useGymStore()
  const [selectedCoach, setSelectedCoach] = useState(coaches[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  const dayBookings = useMemo(
    () => bookings.filter(b => b.coachId === selectedCoach && b.datetime.startsWith(selectedDate)),
    [bookings, selectedCoach, selectedDate]
  )

  const coachOnLeave = useMemo(
    () => isCoachOnLeave(selectedCoach, selectedDate, leaveRecords),
    [selectedCoach, selectedDate, leaveRecords]
  )

  const leaveInfo = useMemo(() => {
    if (!coachOnLeave) return null
    return leaveRecords.find(l =>
      l.coachId === selectedCoach && l.status === 'approved' && l.startDate <= selectedDate && l.endDate >= selectedDate
    )
  }, [coachOnLeave, leaveRecords, selectedCoach, selectedDate])

  const weekday = new Date(selectedDate).getDay()
  const coachSchedules = useMemo(
    () => schedules.filter(s => s.coachId === selectedCoach && s.weekday === weekday),
    [schedules, selectedCoach, weekday]
  )

  const unavailableSlots = useMemo(() => {
    if (coachOnLeave || coachSchedules.length === 0) {
      return [{ time: '全天', reason: coachOnLeave ? `休假: ${leaveInfo?.reason ?? ''}` : '无排课' }]
    }
    return []
  }, [coachOnLeave, coachSchedules, leaveInfo])

  const stats = useMemo(() => {
    const confirmed = dayBookings.filter(b => b.status === 'confirmed').length
    const completed = dayBookings.filter(b => b.status === 'completed').length
    const cancelled = dayBookings.filter(b => b.status === 'cancelled').length
    const substituted = dayBookings.filter(b => b.isSubstituted).length
    return { confirmed, completed, cancelled, substituted, total: dayBookings.length }
  }, [dayBookings])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">教练课表</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedCoach}
            onChange={e => setSelectedCoach(e.target.value)}
            className="px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-dark/40" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="card-dark p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-white/40 mt-1">总预约</div>
        </div>
        <div className="card-dark p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.confirmed}</div>
          <div className="text-xs text-white/40 mt-1">已确认</div>
        </div>
        <div className="card-dark p-3 text-center">
          <div className="text-2xl font-bold text-white/50">{stats.completed}</div>
          <div className="text-xs text-white/40 mt-1">已完成</div>
        </div>
        <div className="card-dark p-3 text-center">
          <div className="text-2xl font-bold text-coral">{stats.cancelled}</div>
          <div className="text-xs text-white/40 mt-1">已取消</div>
        </div>
        <div className="card-dark p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{stats.substituted}</div>
          <div className="text-xs text-white/40 mt-1">代课</div>
        </div>
      </div>

      {unavailableSlots.length > 0 && (
        <div className="space-y-2">
          {unavailableSlots.map((slot, i) => (
            <div
              key={i}
              className="card-dark p-4 border-l-4 border-coral flex items-center gap-3"
            >
              <Ban className="w-5 h-5 text-coral shrink-0" />
              <div>
                <div className="text-coral font-medium text-sm">{slot.time}</div>
                <div className="text-white/50 text-xs">{slot.reason}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {dayBookings.length === 0 && unavailableSlots.length === 0 && (
          <div className="card-dark p-12 text-center text-white/30">当日无预约记录</div>
        )}
        {dayBookings
          .sort((a, b) => a.datetime.localeCompare(b.datetime))
          .map(booking => (
            <BookingDetailCard
              key={booking.id}
              booking={booking}
              packages={packages}
              transactions={transactions}
              courses={courses}
              closingSnapshots={closingSnapshots}
              coaches={coaches}
            />
          ))}
      </div>

      <div className="card-warm p-4">
        <div className="flex items-center gap-4 text-xs text-dark/50 flex-wrap">
          <span>课程等级：</span>
          {courseLevels.map(lv => (
            <span key={lv.id} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LEVEL_COLORS[lv.id] ?? '#999' }} />
              {lv.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
