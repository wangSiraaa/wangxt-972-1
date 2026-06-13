import type { Package, Transaction } from '@/types'

export function calculateBalance(packageId: string, transactions: Transaction[]): number {
  return transactions
    .filter(t => t.packageId === packageId && t.type !== 'CLOSING')
    .reduce((sum, t) => {
      if (t.type === 'POSITIVE' || t.type === 'COMPENSATION' || t.type === 'ADJUSTMENT') {
        return sum + t.amount
      }
      if (t.type === 'REVERSAL') {
        return sum + t.amount
      }
      return sum
    }, 0)
}

export function isPackageFrozen(pkg: Package, now: Date = new Date()): boolean {
  if (pkg.status === 'frozen') return true
  if (pkg.freezeStart && pkg.freezeEnd) {
    const start = new Date(pkg.freezeStart)
    const end = new Date(pkg.freezeEnd)
    return now >= start && now <= end
  }
  return false
}

export function isPackageExpired(pkg: Package, now: Date = new Date()): boolean {
  return new Date(pkg.expireDate) < now
}

export function getAvailableBalance(pkg: Package, transactions: Transaction[]): number {
  if (isPackageFrozen(pkg) || isPackageExpired(pkg) || pkg.status !== 'active') return 0
  return calculateBalance(pkg.id, transactions)
}
