import type { Package, Transaction, SimulationResult, TransactionSource, Booking, FamilyGroup } from '@/types'
import { getAvailableBalance, isPackageFrozen, isPackageExpired, getPackageType, getPackagePriority, generateDeductionDetails, matchPackagesForDeduction } from './balanceEngine'
import { generateId } from '@/lib/storage'

export function createPositiveTransaction(
  packageId: string,
  bookingId: string,
  amount: number,
  description: string,
  operatorId?: string,
  isSharedDeduction?: boolean,
  sharedFromMemberId?: string,
  source?: TransactionSource
): Transaction {
  return {
    id: generateId(),
    packageId,
    bookingId,
    type: 'POSITIVE',
    amount: -amount,
    description,
    createdAt: new Date().toISOString(),
    operatorId,
    isSharedDeduction,
    sharedFromMemberId,
    source: source ?? 'booking',
  }
}

export function createReversalTransaction(
  originalTransaction: Transaction,
  reason: string,
  source?: TransactionSource
): Transaction {
  return {
    id: generateId(),
    packageId: originalTransaction.packageId,
    bookingId: originalTransaction.bookingId,
    type: 'REVERSAL',
    amount: -originalTransaction.amount,
    description: `冲正: ${reason}`,
    createdAt: new Date().toISOString(),
    source: source ?? 'cancellation',
    relatedBookingId: originalTransaction.bookingId,
  }
}

export function createCompensationTransaction(
  packageId: string,
  bookingId: string,
  amount: number,
  reason: string,
  source?: TransactionSource,
  operatorId?: string
): Transaction {
  return {
    id: generateId(),
    packageId,
    bookingId,
    type: 'COMPENSATION',
    amount,
    description: `补偿: ${reason}`,
    createdAt: new Date().toISOString(),
    source: source ?? 'compensation',
    operatorId,
  }
}

export function createAdjustmentTransaction(
  packageId: string,
  amount: number,
  reason: string,
  closingSnapshotId: string,
  operatorId?: string
): Transaction {
  return {
    id: generateId(),
    packageId,
    type: 'ADJUSTMENT',
    amount,
    description: `调整单: ${reason}`,
    createdAt: new Date().toISOString(),
    closingSnapshotId,
    source: 'adjustment',
    operatorId,
  }
}

export function createSubstitutionTransactions(
  booking: Booking,
  originalPackageId: string,
  substitutePackageId: string,
  reason: string,
  operatorId?: string
): Transaction[] {
  const txs: Transaction[] = []

  const reversal: Transaction = {
    id: generateId(),
    packageId: originalPackageId,
    bookingId: booking.id,
    type: 'REVERSAL',
    amount: 1,
    description: `冲正: 教练代课，原教练课时返还`,
    createdAt: new Date().toISOString(),
    source: 'substitution',
    relatedBookingId: booking.id,
    operatorId,
  }
  txs.push(reversal)

  const positive: Transaction = {
    id: generateId(),
    packageId: substitutePackageId,
    bookingId: booking.id,
    type: 'POSITIVE',
    amount: -1,
    description: `扣课: 教练代课，代课教练扣课`,
    createdAt: new Date().toISOString(),
    source: 'substitution',
    relatedBookingId: booking.id,
    operatorId,
  }
  txs.push(positive)

  return txs
}

export function createComplaintTransactions(
  booking: Booking,
  packageId: string,
  refundAmount: number,
  reason: string,
  operatorId?: string
): Transaction[] {
  const txs: Transaction[] = []

  const compensation: Transaction = {
    id: generateId(),
    packageId,
    bookingId: booking.id,
    type: 'COMPENSATION',
    amount: refundAmount,
    description: `申诉补偿: ${reason}`,
    createdAt: new Date().toISOString(),
    source: 'complaint',
    operatorId,
  }
  txs.push(compensation)

  return txs
}

export function createBatchRescheduleTransactions(
  bookings: Booking[],
  packages: Package[],
  transactions: Transaction[],
  reason: string,
  operatorId?: string
): { txs: Transaction[]; successCount: number; failCount: number } {
  const txs: Transaction[] = []
  let successCount = 0
  let failCount = 0

  for (const booking of bookings) {
    const originalTx = transactions.find(
      t => t.bookingId === booking.id && t.type === 'POSITIVE'
    )
    if (originalTx) {
      const reversal = createReversalTransaction(originalTx, `批量改课: ${reason}`, 'batch_reschedule')
      txs.push(reversal)
      successCount++
    } else {
      failCount++
    }
  }

  return { txs, successCount, failCount }
}

export function simulateDeduction(
  memberId: string,
  courseLevelId: string,
  storeId: string,
  packages: Package[],
  transactions: Transaction[],
  familyGroups: FamilyGroup[],
  packageTypes: { id: string; name: string }[],
  requiredSessions: number = 1
): SimulationResult {
  const { matched, canDeduct, reason } = matchPackagesForDeduction(
    memberId, courseLevelId, storeId, packages, transactions, familyGroups, requiredSessions
  )

  let remaining = requiredSessions
  const matchedPackages: SimulationResult['matchedPackages'] = []
  const beforeSnapshot: Record<string, number> = {}
  const afterSnapshot: Record<string, number> = {}

  for (const pkg of matched) {
    const currentBalance = getAvailableBalance(pkg, transactions)
    beforeSnapshot[pkg.id] = currentBalance
    const deduction = Math.min(currentBalance, remaining)
    remaining -= deduction
    afterSnapshot[pkg.id] = currentBalance - deduction
    matchedPackages.push({
      packageId: pkg.id,
      packageTypeName: packageTypes.find(pt => pt.id === pkg.packageTypeId)?.name ?? '未知',
      expireDate: pkg.expireDate,
      currentBalance,
      deductionAmount: deduction,
      afterBalance: currentBalance - deduction,
      isGift: pkg.isGift,
    })
  }

  return {
    matchedPackages,
    totalDeduction: requiredSessions - remaining,
    canDeduct,
    reason: canDeduct ? undefined : reason,
    beforeSnapshot,
    afterSnapshot,
  }
}

export function getTransactionSourceLabel(source?: TransactionSource): string {
  const labels: Record<TransactionSource, string> = {
    booking: '预约扣课',
    cancellation: '取消返还',
    leave: '教练休假',
    substitution: '教练代课',
    complaint: '会员申诉',
    batch_reschedule: '批量改课',
    adjustment: '财务调整',
    purchase: '购买课包',
    gift: '赠送课时',
    compensation: '补偿课时',
    transfer: '课包转让',
    refund: '退课退款',
  }
  return source ? labels[source] ?? '其他' : '其他'
}

export function getOriginalBookingTx(
  bookingId: string,
  transactions: Transaction[]
): Transaction | undefined {
  return transactions.find(
    t => t.bookingId === bookingId && t.type === 'POSITIVE' && t.source !== 'substitution'
  )
}

export function getBookingTransactions(
  bookingId: string,
  transactions: Transaction[]
): Transaction[] {
  return transactions.filter(t => t.bookingId === bookingId || t.relatedBookingId === bookingId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function calculateCoachCommissionEffect(
  coachId: string,
  booking: Booking,
  commissionRate: number,
  perSessionAmount: number = 200
): number {
  if (booking.status === 'completed') {
    return commissionRate * perSessionAmount
  }
  return 0
}

export { matchPackagesForDeduction }
