import type { Booking, ClosingSnapshot, Package, Transaction, ReconciliationDiff } from '@/types'
import { calculateBalance } from './balanceEngine'
import { generateId } from '@/lib/storage'

export function createClosingSnapshot(
  period: string,
  packages: Package[],
  transactions: Transaction[]
): ClosingSnapshot {
  const snapshotData: Record<string, number> = {}
  packages.forEach(pkg => {
    snapshotData[pkg.id] = calculateBalance(pkg.id, transactions)
  })
  return {
    id: generateId(),
    period,
    createdAt: new Date().toISOString(),
    isLocked: true,
    snapshotData,
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
