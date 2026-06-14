import { useState, useMemo } from 'react'
import { Search, BookOpen, X, AlertCircle, Lock, FileEdit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { SimulationResult, Booking } from '@/types'

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

export default function BookingPage() {
  const {
    currentUser, coaches, courses, courseLevels, venues, stores,
    bookings, members, schedules, createBooking, cancelBooking,
    simulateDeductionForBooking, isBookingLocked,
  } = useGymStore()

  const [filterCoach, setFilterCoach] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterStore, setFilterStore] = useState('')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10))

  const [bookingCourse, setBookingCourse] = useState<string | null>(null)
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [bookingError, setBookingError] = useState('')
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelAfterStart, setCancelAfterStart] = useState(false)
  const [lockedAlert, setLockedAlert] = useState<{ show: boolean; period: string; error: string }>({ show: false, period: '', error: '' })

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      if (filterLevel && c.levelId !== filterLevel) return false
      if (filterStore && c.storeId !== filterStore) return false
      return true
    })
  }, [courses, filterLevel, filterStore])

  const getCoachName = (id: string) => coaches.find(c => c.id === id)?.name ?? '未知'
  const getVenueName = (id: string) => venues.find(v => v.id === id)?.name ?? '未知'
  const getLevelName = (id: string) => courseLevels.find(l => l.id === id)?.name ?? '未知'

  const getAvailableCapacity = (coachId: string, courseId: string) => {
    const schedule = schedules.find(s => s.coachId === coachId)
    if (!schedule) return 0
    const confirmed = bookings.filter(
      b => b.coachId === coachId && b.courseId === courseId && b.status === 'confirmed'
    ).length
    return Math.max(0, schedule.capacity - confirmed)
  }

  const handleBook = (courseId: string) => {
    if (!currentUser) return
    const course = courses.find(c => c.id === courseId)
    if (!course) return
    const sim = simulateDeductionForBooking(currentUser.id, courseId, course.storeId)
    setSimulation(sim)
    setBookingCourse(courseId)
    setBookingError('')
  }

  const handleConfirmBooking = () => {
    if (!currentUser || !bookingCourse) return
    const course = courses.find(c => c.id === bookingCourse)
    if (!course) return
    const result = createBooking(
      currentUser.id,
      course.storeId === 'store2' ? 'coach3' : 'coach1',
      bookingCourse,
      `${filterDate}T09:00`,
      course.storeId
    )
    if (result.success) {
      setBookingCourse(null)
      setSimulation(null)
    } else {
      setBookingError(result.error ?? '预约失败')
    }
  }

  const handleCancel = () => {
    if (!cancelBookingId || !cancelReason) return
    const result = cancelBooking(cancelBookingId, cancelReason, cancelAfterStart)
    if (result.requiresAdjustment) {
      setLockedAlert({ show: true, period: result.lockedPeriod ?? '', error: result.error ?? '' })
      setCancelBookingId(null)
      setCancelReason('')
      setCancelAfterStart(false)
      return
    }
    setCancelBookingId(null)
    setCancelReason('')
    setCancelAfterStart(false)
  }

  const myUpcomingBookings = useMemo(() => {
    if (!currentUser) return []
    return bookings
      .filter(b => b.memberId === currentUser.id && (b.status === 'confirmed' || b.status === 'waitlisted'))
      .sort((a, b) => a.datetime.localeCompare(b.datetime))
  }, [bookings, currentUser])

  return (
    <div className="space-y-6">
      <h1 className="heading-display text-2xl font-bold text-dark">预约中心</h1>

      <div className="card-warm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-dark/30" />
            <select
              value={filterCoach}
              onChange={e => setFilterCoach(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            >
              <option value="">全部教练</option>
              {coaches.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            <option value="">全部等级</option>
            {courseLevels.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select
            value={filterStore}
            onChange={e => setFilterStore(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            <option value="">全部门店</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map(course => {
          const levelColor = LEVEL_COLORS[course.levelId] ?? '#999'
          const matchingCoach = filterCoach
            ? coaches.find(c => c.id === filterCoach)
            : coaches.find(c => c.storeId === course.storeId)
          const capacity = matchingCoach ? getAvailableCapacity(matchingCoach.id, course.id) : 0

          return (
            <div key={course.id} className="card-dark p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-medium">{course.name}</h3>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2"
                  style={{ backgroundColor: `${levelColor}20`, color: levelColor }}
                >
                  {getLevelName(course.levelId)}
                </span>
              </div>
              <div className="space-y-1 text-xs text-white/50 mb-4 flex-1">
                <div>教练: {matchingCoach?.name ?? '待定'}</div>
                <div>场地: {getVenueName(course.venueId)}</div>
                <div>时长: {course.duration}分钟</div>
                <div>可用名额: <span className="text-gold">{capacity}</span></div>
              </div>
              <button
                onClick={() => handleBook(course.id)}
                disabled={!currentUser || capacity <= 0}
                className={cn(
                  'w-full py-2 rounded-lg text-sm font-medium transition-colors',
                  currentUser && capacity > 0
                    ? 'bg-gold text-emerald-950 hover:bg-gold-light'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                )}
              >
                <BookOpen className="w-4 h-4 inline mr-1" />
                预约
              </button>
            </div>
          )
        })}
      </div>

      <div className="card-dark overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">我的待上课</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium">时间</th>
              <th className="text-left px-5 py-3 font-medium">课程</th>
              <th className="text-left px-5 py-3 font-medium">教练</th>
              <th className="text-left px-5 py-3 font-medium">状态</th>
              <th className="text-left px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {myUpcomingBookings.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">暂无待上课</td></tr>
            )}
            {myUpcomingBookings.map(b => {
              const course = courses.find(c => c.id === b.courseId)
              const badge = STATUS_LABELS[b.status]
              return (
                <tr key={b.id} className="text-white/80">
                  <td className="px-5 py-3">{b.datetime.replace('T', ' ')}</td>
                  <td className="px-5 py-3">{course?.name ?? '未知'}</td>
                  <td className="px-5 py-3 text-white/50">{getCoachName(b.coachId)}</td>
                  <td className="px-5 py-3">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', badge.cls)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      const lockInfo = isBookingLocked(b.id)
                      if (lockInfo.locked) {
                        return (
                          <div className="flex items-center gap-1 text-xs text-white/30" title={`期间 ${lockInfo.period} 已关账，请通过财务调整单处理`}>
                            <Lock className="w-3 h-3" />
                            <span>期间锁定</span>
                          </div>
                        )
                      }
                      return (
                        <button
                          onClick={() => setCancelBookingId(b.id)}
                          className="text-xs text-coral hover:text-coral-light transition-colors"
                        >
                          取消
                        </button>
                      )
                    })()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {bookingCourse && simulation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setBookingCourse(null); setSimulation(null); setBookingError('') }}>
          <div className="card-dark p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">确认预约</h2>
            <div className="space-y-4">
              <div className="bg-dark-light rounded-lg p-4">
                <div className="text-white font-medium mb-2">
                  {courses.find(c => c.id === bookingCourse)?.name}
                </div>
                <div className="text-xs text-white/50">
                  {courses.find(c => c.id === bookingCourse)?.duration}分钟 · {filterDate}
                </div>
              </div>

              <div>
                <div className="text-xs text-white/50 mb-2">扣减模拟</div>
                <div className="bg-dark-light rounded-lg p-3">
                  {simulation.canDeduct ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white/40">
                          <th className="text-left py-1 font-medium">课包</th>
                          <th className="text-right py-1 font-medium">扣减前</th>
                          <th className="text-right py-1 font-medium">扣减后</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulation.matchedPackages.map(mp => (
                          <tr key={mp.packageId} className="text-white/70">
                            <td className="py-1">
                              {mp.packageTypeName}
                              {mp.isGift && <span className="ml-1 text-gold">赠</span>}
                            </td>
                            <td className="text-right py-1">{mp.currentBalance}</td>
                            <td className="text-right py-1 text-gold">{mp.afterBalance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center gap-2 text-coral text-xs">
                      <AlertCircle className="w-4 h-4" />
                      {simulation.reason ?? '余额不足'}
                    </div>
                  )}
                </div>
              </div>

              {bookingError && (
                <div className="flex items-center gap-2 text-coral text-sm bg-coral/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {bookingError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setBookingCourse(null); setSimulation(null); setBookingError('') }}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={!simulation.canDeduct}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                    simulation.canDeduct
                      ? 'bg-gold text-emerald-950 hover:bg-gold-light'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                  )}
                >
                  确认预约
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelBookingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCancelBookingId(null)}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">取消预约</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">取消原因</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cancelAfterStart}
                  onChange={e => setCancelAfterStart(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-dark-light text-gold focus:ring-gold/40"
                />
                <span className="text-sm text-white/70">课程已开始</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setCancelBookingId(null)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCancel}
                  disabled={!cancelReason}
                  className="px-4 py-2 rounded-lg bg-coral text-white font-medium text-sm hover:bg-coral-dark transition-colors disabled:opacity-50"
                >
                  确认取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lockedAlert.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setLockedAlert({ ...lockedAlert, show: false })}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">期间已关账</h2>
                <div className="text-xs text-white/40">所属期间 {lockedAlert.period}</div>
              </div>
            </div>
            <div className="bg-coral/10 border border-coral/20 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2 text-coral text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{lockedAlert.error}</div>
              </div>
            </div>
            <div className="bg-dark-light rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2 text-xs text-white/60">
                <FileEdit className="w-4 h-4 shrink-0 mt-0.5 text-gold" />
                <div>
                  请联系财务人员在<span className="text-gold mx-1">月度关账 → 调整单</span>中创建调整单处理历史预约的冲销或修改，调整单审批后会自动生成 ADJUSTMENT 类型流水参与余额重放。
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setLockedAlert({ ...lockedAlert, show: false })}
                className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
