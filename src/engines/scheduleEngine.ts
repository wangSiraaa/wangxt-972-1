import type { Schedule, Booking, LeaveRecord, Venue, Course, SubstitutionRecord, ComplaintRecord, BatchRescheduleRecord, ClosingSnapshot } from '@/types'
import { isBookingInClosedPeriod } from './closingEngine'

export function getCoachAvailableCapacity(
  coachId: string,
  weekday: number,
  startTime: string,
  bookings: Booking[]
): number {
  const confirmedCount = bookings.filter(
    b => b.coachId === coachId && b.status === 'confirmed' && b.datetime.includes(startTime)
  ).length
  return confirmedCount
}

export function getVenueOccupancy(
  venueId: string,
  datetime: string,
  bookings: Booking[],
  courses: { id: string; venueId: string }[]
): { occupied: number; capacity: number } {
  const courseIdsAtVenue = courses.filter(c => c.venueId === venueId).map(c => c.id)
  const occupied = bookings.filter(
    b => courseIdsAtVenue.includes(b.courseId) && b.datetime === datetime && b.status === 'confirmed'
  ).length
  return { occupied, capacity: 0 }
}

export function isCoachOnLeave(
  coachId: string,
  date: string,
  leaveRecords: LeaveRecord[]
): boolean {
  return leaveRecords.some(
    lr =>
      lr.coachId === coachId &&
      lr.status === 'approved' &&
      date >= lr.startDate &&
      date <= lr.endDate
  )
}

export function getBookingsAffectedByLeave(
  coachId: string,
  startDate: string,
  endDate: string,
  bookings: Booking[]
): Booking[] {
  return bookings.filter(
    b =>
      b.coachId === coachId &&
      b.status === 'confirmed' &&
      b.datetime.slice(0, 10) >= startDate &&
      b.datetime.slice(0, 10) <= endDate
  )
}

export function getScheduleForCoachAndDay(
  coachId: string,
  weekday: number,
  schedules: Schedule[]
): Schedule[] {
  return schedules.filter(s => s.coachId === coachId && s.weekday === weekday)
}

export function canSubstituteCoach(
  originalCoachId: string,
  substituteCoachId: string,
  datetime: string,
  bookings: Booking[],
  schedules: Schedule[]
): { canSubstitute: boolean; reason?: string } {
  if (originalCoachId === substituteCoachId) {
    return { canSubstitute: false, reason: '不能选择同一教练' }
  }

  const date = datetime.slice(0, 10)
  const weekday = new Date(datetime).getDay()
  const timeStr = datetime.slice(11, 16)

  const substituteSchedule = schedules.find(
    s => s.coachId === substituteCoachId && s.weekday === weekday && s.startTime <= timeStr && s.endTime > timeStr
  )
  if (!substituteSchedule) {
    return { canSubstitute: false, reason: '代课教练该时段无排课' }
  }

  const existingBooking = bookings.find(
    b => b.coachId === substituteCoachId && b.datetime === datetime && b.status === 'confirmed'
  )
  if (existingBooking) {
    return { canSubstitute: false, reason: '代课教练该时段已有预约' }
  }

  return { canSubstitute: true }
}

export function createSubstitution(
  booking: Booking,
  substituteCoachId: string,
  reason: string,
  operatorId?: string
): { booking: Booking; substitution: SubstitutionRecord } {
  const updatedBooking: Booking = {
    ...booking,
    coachId: substituteCoachId,
    originalCoachId: booking.coachId,
    isSubstituted: true,
  }

  const substitution: SubstitutionRecord = {
    id: '',
    bookingId: booking.id,
    originalCoachId: booking.coachId,
    substituteCoachId,
    reason,
    status: 'approved',
    createdAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    operatorId,
  }

  return { booking: updatedBooking, substitution }
}

export function canFileComplaint(
  booking: Booking,
  closingSnapshots: ClosingSnapshot[]
): { canFile: boolean; reason?: string } {
  if (booking.status !== 'completed' && booking.status !== 'no_show') {
    return { canFile: false, reason: '只有已完成或未到的课程可以申诉' }
  }

  const { closed } = isBookingInClosedPeriod(booking, closingSnapshots)
  if (closed) {
    return { canFile: true, reason: '关账期间申诉需通过调整单处理' }
  }

  return { canFile: true }
}

export function createComplaintRecord(
  bookingId: string,
  memberId: string,
  reason: string,
  refundSessions: number,
  description?: string
): ComplaintRecord {
  return {
    id: '',
    bookingId,
    memberId,
    reason,
    status: 'pending',
    refundSessions,
    createdAt: new Date().toISOString(),
    description,
  }
}

export function canBatchReschedule(
  coachId: string,
  fromDate: string,
  toDate: string,
  bookings: Booking[],
  closingSnapshots: ClosingSnapshot[]
): { canBatch: boolean; affectedBookings: Booking[]; lockedBookings: Booking[]; reason?: string } {
  const affectedBookings = bookings.filter(
    b => b.coachId === coachId && b.status === 'confirmed' && b.datetime.slice(0, 10) >= fromDate && b.datetime.slice(0, 10) <= toDate
  )

  const lockedBookings = affectedBookings.filter(
    b => isBookingInClosedPeriod(b, closingSnapshots).closed
  )

  if (lockedBookings.length > 0) {
    return {
      canBatch: false,
      affectedBookings,
      lockedBookings,
      reason: `${lockedBookings.length}个预约所属期间已关账，不能直接批量改课，请通过调整单处理`
    }
  }

  return { canBatch: true, affectedBookings, lockedBookings: [] }
}

export function createBatchRescheduleRecord(
  coachId: string,
  fromDate: string,
  toDate: string,
  reason: string,
  affectedBookingIds: string[],
  operatorId?: string
): BatchRescheduleRecord {
  return {
    id: '',
    fromDate,
    toDate,
    coachId,
    reason,
    affectedBookingIds,
    status: 'pending',
    createdAt: new Date().toISOString(),
    operatorId,
    successCount: 0,
    failCount: 0,
  }
}

export function getBookingDeductionExplanation(
  booking: Booking,
  packages: { id: string; name?: string; isGift: boolean; isCompensation: boolean; isCorporate: boolean; memberId: string }[],
  transactions: { bookingId?: string; packageId: string; amount: number; type: string; source?: string; relatedBookingId?: string; isSharedDeduction?: boolean; sharedFromMemberId?: string }[],
  members?: { id: string; name: string }[]
): { packageName: string; packageType: string; deductionAmount: number; reason: string; sharedFrom?: string }[] {
  const bookingTxs = transactions.filter(
    t => (t.bookingId === booking.id || t.relatedBookingId === booking.id) && t.type !== 'CLOSING'
  )

  const explanations: { packageName: string; packageType: string; deductionAmount: number; reason: string; sharedFrom?: string }[] = []

  for (const tx of bookingTxs) {
    const pkg = packages.find(p => p.id === tx.packageId)
    if (!pkg) continue

    let packageType = '购买课包'
    let sharedFrom: string | undefined

    if (tx.isSharedDeduction && tx.sharedFromMemberId) {
      packageType = '家庭共享'
      const fromMember = members?.find(m => m.id === tx.sharedFromMemberId)
      sharedFrom = fromMember ? fromMember.name : tx.sharedFromMemberId
    } else if (pkg.isGift) {
      packageType = '赠课'
    } else if (pkg.isCompensation) {
      packageType = '补偿课时'
    } else if (pkg.isCorporate) {
      packageType = '企业团课'
    }

    let reason = ''
    if (tx.type === 'POSITIVE') {
      reason = tx.source === 'substitution' ? '代课扣课' : '预约扣课'
    } else if (tx.type === 'REVERSAL') {
      reason = tx.source === 'substitution' ? '代课返还' : '取消返还'
    } else if (tx.type === 'COMPENSATION') {
      reason = '补偿返还'
    } else if (tx.type === 'ADJUSTMENT') {
      reason = '财务调整'
    }

    explanations.push({
      packageName: pkg.name,
      packageType,
      deductionAmount: tx.amount,
      reason,
      sharedFrom,
    })
  }

  return explanations
}

export function getBookingRestrictionReasons(
  booking: Booking,
  closingSnapshots: ClosingSnapshot[],
  packages: { id: string; status: string; freezeStart?: string; freezeEnd?: string; expireDate: string; storeIds: string[]; courseLevelIds: string[] }[],
  courses: { id: string; levelId: string; storeId: string }[]
): string[] {
  const reasons: string[] = []

  const { closed, period } = isBookingInClosedPeriod(booking, closingSnapshots)
  if (closed) {
    reasons.push(`期间${period}已关账，不能直接修改`)
  }

  const pkg = packages.find(p => p.id === booking.packageId)
  if (pkg) {
    if (pkg.status === 'frozen') {
      reasons.push('课包已冻结')
    }
    if (new Date(pkg.expireDate) < new Date()) {
      reasons.push('课包已过期')
    }
  }

  const course = courses.find(c => c.id === booking.courseId)
  if (pkg && course) {
    if (pkg.storeIds.length > 0 && !pkg.storeIds.includes(course.storeId)) {
      reasons.push('课包不适用该门店')
    }
    if (pkg.courseLevelIds.length > 0 && !pkg.courseLevelIds.includes(course.levelId)) {
      reasons.push('课包不适用该课程等级')
    }
  }

  return reasons
}
