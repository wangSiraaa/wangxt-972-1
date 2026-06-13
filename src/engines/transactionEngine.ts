import type { Package, Transaction, SimulationResult } from '@/types'
import { getAvailableBalance, isPackageFrozen, isPackageExpired } from './balanceEngine'
import { generateId } from '@/lib/storage'

export function matchPackagesForDeduction(
  memberId: string,
  courseLevelId: string,
  packages: Package[],
  transactions: Transaction[],
  requiredSessions: number = 1
): { matched: Package[]; canDeduct: boolean; reason?: string } {
  const activePackages = packages
    .filter(p => p.memberId === memberId && p.status === 'active')
    .filter(p => !isPackageFrozen(p) && !isPackageExpired(p))
    .filter(p => p.courseLevelIds.length === 0 || p.courseLevelIds.includes(courseLevelId))
    .sort((a, b) => {
      if (a.isGift !== b.isGift) return a.isGift ? -1 : 1
      return new Date(a.expireDate).getTime() - new Date(b.expireDate).getTime()
    })

  let remaining = requiredSessions
  const matched: Package[] = []

  for (const pkg of activePackages) {
    if (remaining <= 0) break
    const balance = getAvailableBalance(pkg, transactions)
    if (balance > 0) {
      matched.push(pkg)
      remaining -= Math.min(balance, remaining)
    }
  }

  if (remaining > 0) {
    return { matched, canDeduct: false, reason: '可用课包余额不足' }
  }
  return { matched, canDeduct: true }
}

export function createPositiveTransaction(
  packageId: string,
  bookingId: string,
  amount: number,
  description: string,
  operatorId?: string,
  isSharedDeduction?: boolean,
  sharedFromMemberId?: string
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
  }
}

export function createReversalTransaction(
  originalTransaction: Transaction,
  reason: string
): Transaction {
  return {
    id: generateId(),
    packageId: originalTransaction.packageId,
    bookingId: originalTransaction.bookingId,
    type: 'REVERSAL',
    amount: -originalTransaction.amount,
    description: `冲正: ${reason}`,
    createdAt: new Date().toISOString(),
  }
}

export function createCompensationTransaction(
  packageId: string,
  bookingId: string,
  amount: number,
  reason: string
): Transaction {
  return {
    id: generateId(),
    packageId,
    bookingId,
    type: 'COMPENSATION',
    amount,
    description: `补偿: ${reason}`,
    createdAt: new Date().toISOString(),
  }
}

export function createAdjustmentTransaction(
  packageId: string,
  amount: number,
  reason: string,
  closingSnapshotId: string
): Transaction {
  return {
    id: generateId(),
    packageId,
    type: 'ADJUSTMENT',
    amount,
    description: `调整单: ${reason}`,
    createdAt: new Date().toISOString(),
    closingSnapshotId,
  }
}

export function simulateDeduction(
  memberId: string,
  courseLevelId: string,
  packages: Package[],
  transactions: Transaction[],
  packageTypes: { id: string; name: string }[],
  requiredSessions: number = 1
): SimulationResult {
  const { matched, canDeduct, reason } = matchPackagesForDeduction(
    memberId, courseLevelId, packages, transactions, requiredSessions
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
