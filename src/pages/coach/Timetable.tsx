import { useState, useMemo } from 'react'
import { Calendar, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import { isCoachOnLeave } from '@/engines/scheduleEngine'
import type { Booking, CourseLevel } from '@/types'

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

export default function Timetable() {
  const { coaches, bookings, courses, courseLevels, members, schedules, leaveRecords } = useGymStore()
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

  const getCourse = (courseId: string) => courses.find(c => c.id === courseId)
  const getMember = (memberId: string) => members.find(m => m.id === memberId)
  const getLevel = (levelId: string) => courseLevels.find(l => l.id === levelId)

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
          .map(booking => {
            const course = getCourse(booking.courseId)
            const member = getMember(booking.memberId)
            const level = course ? getLevel(course.levelId) : null
            const isCancelled = booking.status === 'cancelled'
            const statusBadge = STATUS_LABELS[booking.status]
            const levelColor = course ? LEVEL_COLORS[course.levelId] ?? '#999' : '#999'

            return (
              <div
                key={booking.id}
                className={cn(
                  'card-dark p-4 flex items-center gap-4 transition-all',
                  isCancelled && 'border-coral/50 opacity-60'
                )}
              >
                <div className="text-center min-w-[60px]">
                  <div className={cn('text-lg font-semibold', isCancelled ? 'line-through text-white/30' : 'text-white')}>
                    {booking.datetime.slice(11, 16)}
                  </div>
                  <div className="text-white/30 text-xs">{booking.duration}分钟</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-medium text-sm', isCancelled ? 'line-through text-white/30' : 'text-white')}>
                      {course?.name ?? '未知课程'}
                    </span>
                    {level && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${levelColor}20`, color: levelColor }}
                      >
                        {level.name}
                      </span>
                    )}
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    会员: {member?.name ?? booking.memberId}
                  </div>
                </div>
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusBadge.cls)}>
                  {statusBadge.label}
                </span>
              </div>
            )
          })}
      </div>

      <div className="card-warm p-4">
        <div className="flex items-center gap-4 text-xs text-dark/50">
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
