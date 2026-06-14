import type {
  Booking, ClosingSnapshot, Package, Transaction, ReconciliationDiff,
  Coach, Course, CommissionDiff, ClosingDiffReport, AdjustmentOrder
} from '@/types'
import { calculateBalance } from './balanceEngine'
import { generateId } from '@/lib/storage'

export function createClosingSnapshot(
  period: string,
  packages: Package[],
  transactions: Transaction[],
  bookings: Booking[],
  coaches: Coach[],
  courses: Course[]
): ClosingSnapshot {
  const snapshotData: Record<string, number> = {}
  packages.forEach(pkg => {
    snapshotData[pkg.id] = calculateBalance(pkg.id, transactions)
  })

  const commissionSnapshot: Record<string, number> = {}
  coaches.forEach(coach => {
    commissionSnapshot[coach.id] = calculateCoachCommission(coach.id, period, bookings, courses, coach.commissionRate)
  })

  return {
    id: generateId(),
    period,
    createdAt: new Date().toISOString(),
    isLocked: true,
    snapshotData,
    commissionSnapshot,
  }
}

export function reconcileClosingSnapshot(
  snapshot: ClosingSnapshot,
  packages: Package[],
  transactions: Transaction[],
  members: { id: string; name: string }[]
): ReconciliationDiff[] {
  const diffs: ReconciliationDiff[] = []
  for (const [packageId, snapshotBalance] of Object.entries(snapshot.snapshotData)) {
    const replayBalance = calculateBalance(packageId, transactions)
    const diff = snapshotBalance - replayBalance
    if (Math.abs(diff) > 0.001) {
      const pkg = packages.find(p => p.id === packageId)
      const member = pkg ? members.find(m => m.id === pkg.memberId) : null
      diffs.push({
        packageId,
        memberId: pkg?.memberId ?? '',
        memberName: member?.name ?? '未知',
        snapshotBalance,
        replayBalance,
        difference: diff,
      })
    }
  }
  return diffs
}

export function calculateCoachCommission(
  coachId: string,
  period: string,
  bookings: Booking[],
  courses: Course[],
  commissionRate: number,
  perSessionAmount: number = 200
): number {
  const periodBookings = bookings.filter(
    b => b.coachId === coachId && b.datetime.startsWith(period) && b.status === 'completed'
  )
  return periodBookings.length * commissionRate * perSessionAmount
}

export function calculateCommissionDiffs(
  snapshot: ClosingSnapshot,
  coaches: Coach[],
  bookings: Booking[],
  courses: Course[]
): CommissionDiff[] {
  const diffs: CommissionDiff[] = []
  const commissionSnapshot = (snapshot as any).commissionSnapshot as Record<string, number> | undefined

  if (!commissionSnapshot) return diffs

  for (const coach of coaches) {
    const snapshotCommission = commissionSnapshot[coach.id] ?? 0
    const actualCommission = calculateCoachCommission(
      coach.id, snapshot.period, bookings, courses, coach.commissionRate
    )
    const difference = snapshotCommission - actualCommission

    if (Math.abs(difference) > 0.001) {
      const periodBookings = bookings.filter(
        b => b.coachId === coach.id && b.datetime.startsWith(snapshot.period) && b.status === 'completed'
      )
      const detail = periodBookings.map(b => {
        const course = courses.find(c => c.id === b.courseId)
        return {
          bookingId: b.id,
          courseName: course?.name ?? '未知课程',
          amount: coach.commissionRate * 200,
          type: 'completed',
        }
      })

      diffs.push({
        coachId: coach.id,
        coachName: coach.name,
        snapshotCommission,
        actualCommission,
        difference,
        detail,
      })
    }
  }

  return diffs
}

export function generateClosingDiffReport(
  snapshot: ClosingSnapshot,
  packages: Package[],
  transactions: Transaction[],
  members: { id: string; name: string }[],
  coaches: Coach[],
  bookings: Booking[],
  courses: Course[],
  adjustmentOrders: AdjustmentOrder[]
): ClosingDiffReport {
  const packageDiffs = reconcileClosingSnapshot(snapshot, packages, transactions, members)
  const commissionDiffs = calculateCommissionDiffs(snapshot, coaches, bookings, courses)
  const relatedAdjustments = adjustmentOrders.filter(a => a.closingSnapshotId === snapshot.id)

  const totalTransactions = transactions.filter(
    t => t.createdAt.startsWith(snapshot.period)
  ).length

  return {
    snapshotId: snapshot.id,
    period: snapshot.period,
    totalPackages: packages.length,
    totalTransactions,
    totalCommission: coaches.reduce(
      (sum, c) => sum + calculateCoachCommission(c.id, snapshot.period, bookings, courses, c.commissionRate),
      0
    ),
    packageDiffs,
    commissionDiffs,
    adjustmentOrders: relatedAdjustments,
  }
}

export function isPeriodClosed(
  period: string,
  closingSnapshots: ClosingSnapshot[]
): boolean {
  return closingSnapshots.some(s => s.period === period && s.isLocked)
}

export function isBookingInClosedPeriod(
  booking: Booking,
  closingSnapshots: ClosingSnapshot[]
): { closed: boolean; period?: string } {
  const period = booking.datetime.slice(0, 7)
  if (isPeriodClosed(period, closingSnapshots)) {
    return { closed: true, period }
  }
  return { closed: false }
}

export function getLockedPeriods(
  closingSnapshots: ClosingSnapshot[]
): string[] {
  return closingSnapshots.filter(s => s.isLocked).map(s => s.period)
}

export function getLatestClosingSnapshot(
  closingSnapshots: ClosingSnapshot[]
): ClosingSnapshot | null {
  if (closingSnapshots.length === 0) return null
  return closingSnapshots[closingSnapshots.length - 1]
}

export function canModifyBooking(
  booking: Booking,
  closingSnapshots: ClosingSnapshot[]
): { canModify: boolean; reason?: string } {
  const { closed, period } = isBookingInClosedPeriod(booking, closingSnapshots)
  if (closed) {
    return { canModify: false, reason: `该预约所属期间(${period})已关账，不能直接修改，请通过调整单处理` }
  }
  return { canModify: true }
}

export function getPeriodTransactions(
  period: string,
  transactions: Transaction[]
): Transaction[] {
  return transactions.filter(t => t.createdAt.startsWith(period))
}

export function getPeriodBookings(
  period: string,
  bookings: Booking[]
): Booking[] {
  return bookings.filter(b => b.datetime.startsWith(period))
}
