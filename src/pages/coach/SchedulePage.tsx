import { useState, useMemo } from 'react'
import { CalendarPlus, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { Schedule, LeaveRecord } from '@/types'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`)

const LEAVE_STATUS: Record<LeaveRecord['status'], { label: string; cls: string }> = {
  pending: { label: '待审批', cls: 'bg-gold/15 text-gold' },
  approved: { label: '已通过', cls: 'bg-emerald-700/20 text-emerald-400' },
  rejected: { label: '已拒绝', cls: 'bg-coral/15 text-coral' },
}

export default function SchedulePage() {
  const { coaches, schedules, bookings, leaveRecords, createLeave, approveLeave, rejectLeave } = useGymStore()
  const [selectedCoach, setSelectedCoach] = useState(coaches[0]?.id ?? '')
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [showAddLeave, setShowAddLeave] = useState(false)
  const [addSlot, setAddSlot] = useState<{ weekday: number; startTime: string } | null>(null)
  const [formWeekday, setFormWeekday] = useState(1)
  const [formStart, setFormStart] = useState('09:00')
  const [formEnd, setFormEnd] = useState('10:00')
  const [formCapacity, setFormCapacity] = useState(3)
  const [leaveStart, setLeaveStart] = useState('')
  const [leaveEnd, setLeaveEnd] = useState('')
  const [leaveReason, setLeaveReason] = useState('')

  const coachSchedules = useMemo(
    () => schedules.filter(s => s.coachId === selectedCoach),
    [schedules, selectedCoach]
  )

  const coachLeaves = useMemo(
    () => leaveRecords.filter(l => l.coachId === selectedCoach),
    [leaveRecords, selectedCoach]
  )

  const getSlotInfo = (weekday: number, time: string) => {
    return coachSchedules.find(s =>
      s.weekday === weekday && s.startTime <= time && s.endTime > time
    )
  }

  const getAvailableCapacity = (schedule: Schedule) => {
    const confirmed = bookings.filter(
      b => b.coachId === schedule.coachId && b.status === 'confirmed'
    ).length
    return schedule.capacity - confirmed
  }

  const handleCellClick = (weekday: number, time: string) => {
    const existing = getSlotInfo(weekday, time)
    if (!existing) {
      setAddSlot({ weekday, startTime: time })
      setFormWeekday(weekday)
      setFormStart(time)
      setShowAddSchedule(true)
    }
  }

  const handleAddSchedule = () => {
    if (!addSlot) return
    const newSchedule: Schedule = {
      id: `sch_${Date.now()}`,
      coachId: selectedCoach,
      weekday: formWeekday,
      startTime: formStart,
      endTime: formEnd,
      capacity: formCapacity,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    }
    const updated = [...schedules, newSchedule]
    useGymStore.setState({ schedules: updated })
    setShowAddSchedule(false)
    setAddSlot(null)
  }

  const handleCreateLeave = () => {
    if (!leaveStart || !leaveEnd || !leaveReason) return
    createLeave(selectedCoach, leaveStart, leaveEnd, leaveReason)
    setLeaveStart('')
    setLeaveEnd('')
    setLeaveReason('')
    setShowAddLeave(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">排课管理</h1>
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
          <button
            onClick={() => setShowAddLeave(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950 text-gold hover:bg-emerald-900 transition-colors text-sm font-medium"
          >
            <CalendarPlus className="w-4 h-4" />
            申请休假
          </button>
        </div>
      </div>

      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left px-3 py-3 font-medium w-20">时间</th>
                {WEEKDAYS.map((d, i) => (
                  <th key={i} className="text-center px-2 py-3 font-medium">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TIME_SLOTS.map(time => (
                <tr key={time}>
                  <td className="px-3 py-2 text-white/50 text-xs font-mono">{time}</td>
                  {WEEKDAYS.map((_, dayIdx) => {
                    const weekday = dayIdx + 1
                    const slot = getSlotInfo(weekday, time)
                    return (
                      <td
                        key={dayIdx}
                        className={cn(
                          'px-2 py-2 text-center cursor-pointer transition-colors',
                          slot ? 'bg-emerald-800/30' : 'hover:bg-dark-lighter/50'
                        )}
                        onClick={() => handleCellClick(weekday, time)}
                      >
                        {slot && (
                          <div className="text-xs">
                            <div className="text-gold font-medium">{slot.startTime}-{slot.endTime}</div>
                            <div className="text-white/50">余{getAvailableCapacity(slot)}/{slot.capacity}</div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-dark overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">休假记录</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium">开始日期</th>
              <th className="text-left px-5 py-3 font-medium">结束日期</th>
              <th className="text-left px-5 py-3 font-medium">原因</th>
              <th className="text-left px-5 py-3 font-medium">状态</th>
              <th className="text-left px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {coachLeaves.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">暂无休假记录</td></tr>
            )}
            {coachLeaves.map(l => {
              const badge = LEAVE_STATUS[l.status]
              return (
                <tr key={l.id} className="text-white/80">
                  <td className="px-5 py-3">{l.startDate}</td>
                  <td className="px-5 py-3">{l.endDate}</td>
                  <td className="px-5 py-3">{l.reason}</td>
                  <td className="px-5 py-3">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', badge.cls)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {l.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveLeave(l.id)}
                          className="p-1 rounded text-emerald-400 hover:bg-emerald-700/20 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rejectLeave(l.id)}
                          className="p-1 rounded text-coral hover:bg-coral/15 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showAddSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddSchedule(false)}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">添加排课</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">星期</label>
                <select
                  value={formWeekday}
                  onChange={e => setFormWeekday(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={i} value={i + 1}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">开始时间</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={e => setFormStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">结束时间</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={e => setFormEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">容量</label>
                <input
                  type="number"
                  min={1}
                  value={formCapacity}
                  onChange={e => setFormCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddSchedule(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddSchedule}
                  className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light transition-colors"
                >
                  确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddLeave(false)}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">申请休假</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">教练</label>
                <select
                  value={selectedCoach}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white/50 focus:outline-none"
                >
                  {coaches.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">开始日期</label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={e => setLeaveStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">结束日期</label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={e => setLeaveEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">原因</label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={e => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddLeave(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateLeave}
                  className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light transition-colors"
                >
                  提交申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
