import { useState, useMemo } from 'react'
import { TrendingUp, DollarSign, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'

const LEVEL_COLORS: Record<string, string> = {
  lv1: '#4ADE80',
  lv2: '#FBBF24',
  lv3: '#F87171',
}

export default function CoachStats() {
  const { coaches, bookings, courses, courseLevels, members, getCoachCommission } = useGymStore()
  const [selectedCoach, setSelectedCoach] = useState(coaches[0]?.id ?? '')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const monthBookings = useMemo(
    () => bookings.filter(b => b.coachId === selectedCoach && b.datetime.startsWith(selectedMonth)),
    [bookings, selectedCoach, selectedMonth]
  )

  const completedCount = useMemo(
    () => monthBookings.filter(b => b.status === 'completed').length,
    [monthBookings]
  )

  const commission = useMemo(
    () => getCoachCommission(selectedCoach, selectedMonth),
    [getCoachCommission, selectedCoach, selectedMonth]
  )

  const coach = coaches.find(c => c.id === selectedCoach)

  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    return new Date(year, month, 0).getDate()
  }, [selectedMonth])

  const avgDaily = daysInMonth > 0 ? (completedCount / daysInMonth).toFixed(1) : '0'

  const dailyCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    monthBookings.filter(b => b.status === 'completed').forEach(b => {
      const day = parseInt(b.datetime.slice(8, 10), 10)
      counts[day] = (counts[day] ?? 0) + 1
    })
    return counts
  }, [monthBookings])

  const maxDailyCount = useMemo(
    () => Math.max(1, ...Object.values(dailyCounts)),
    [dailyCounts]
  )

  const levelDistribution = useMemo(() => {
    const dist: Record<string, number> = {}
    monthBookings.filter(b => b.status === 'completed').forEach(b => {
      const course = courses.find(c => c.id === b.courseId)
      if (course) {
        dist[course.levelId] = (dist[course.levelId] ?? 0) + 1
      }
    })
    return dist
  }, [monthBookings, courses])

  const totalLevelCount = Object.values(levelDistribution).reduce((s, v) => s + v, 0)

  const commissionBreakdown = useMemo(
    () => monthBookings
      .filter(b => b.status === 'completed')
      .map(b => {
        const course = courses.find(c => c.id === b.courseId)
        const member = members.find(m => m.id === b.memberId)
        return {
          date: b.datetime.slice(0, 10),
          courseName: course?.name ?? '未知',
          memberName: member?.name ?? '未知',
          amount: coach ? coach.commissionRate * 200 : 0,
        }
      }),
    [monthBookings, courses, members, coach]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">教练统计</h1>
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
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-dark p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-800/50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-white/50 text-sm">本月授课数</span>
          </div>
          <div className="text-3xl font-bold text-white">{completedCount}</div>
        </div>
        <div className="card-dark p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-gold" />
            </div>
            <span className="text-white/50 text-sm">佣金金额</span>
          </div>
          <div className="text-3xl font-bold text-gold">¥{commission.toFixed(0)}</div>
        </div>
        <div className="card-dark p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white/50" />
            </div>
            <span className="text-white/50 text-sm">平均每日课时</span>
          </div>
          <div className="text-3xl font-bold text-white">{avgDaily}</div>
        </div>
      </div>

      <div className="card-dark p-5">
        <h2 className="text-white font-semibold mb-4">每日授课统计</h2>
        <div className="flex items-end gap-1 h-40">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const count = dailyCounts[day] ?? 0
            const height = maxDailyCount > 0 ? (count / maxDailyCount) * 100 : 0
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-white/30 text-[10px]">{count || ''}</span>
                <div className="w-full relative" style={{ height: '120px' }}>
                  <div
                    className={cn(
                      'absolute bottom-0 w-full rounded-t transition-all',
                      count > 0 ? 'bg-gold/70' : 'bg-white/5'
                    )}
                    style={{ height: `${Math.max(height, count > 0 ? 4 : 2)}%` }}
                  />
                </div>
                <span className="text-white/20 text-[9px]">{day}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-dark p-5">
          <h2 className="text-white font-semibold mb-4">课程等级分布</h2>
          {totalLevelCount === 0 ? (
            <div className="text-white/30 text-sm">本月无授课记录</div>
          ) : (
            <div className="flex items-center justify-center gap-8 py-4">
              {courseLevels.map(lv => {
                const count = levelDistribution[lv.id] ?? 0
                const pct = totalLevelCount > 0 ? ((count / totalLevelCount) * 100).toFixed(1) : '0'
                const color = LEVEL_COLORS[lv.id] ?? '#999'
                return (
                  <div key={lv.id} className="text-center">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <span className="text-lg font-bold" style={{ color }}>{count}</span>
                    </div>
                    <div className="text-white/70 text-sm">{lv.name}</div>
                    <div className="text-xs" style={{ color }}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card-dark p-5">
          <h2 className="text-white font-semibold mb-4">佣金明细</h2>
          <div className="overflow-y-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/10">
                  <th className="text-left py-2 font-medium">日期</th>
                  <th className="text-left py-2 font-medium">课程</th>
                  <th className="text-left py-2 font-medium">会员</th>
                  <th className="text-right py-2 font-medium">佣金</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {commissionBreakdown.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-white/30">暂无数据</td></tr>
                )}
                {commissionBreakdown.map((row, i) => (
                  <tr key={i} className="text-white/70">
                    <td className="py-2 text-xs">{row.date}</td>
                    <td className="py-2">{row.courseName}</td>
                    <td className="py-2 text-white/50">{row.memberName}</td>
                    <td className="py-2 text-right text-gold">¥{row.amount.toFixed(0)}</td>
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
