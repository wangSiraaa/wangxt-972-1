import type { Package, Transaction, PackageType, DeductionDetail, PackageAccountSummary, BookingExplanation } from '@/types'

export function calculateBalance(packageId: string, transactions: Transaction[]): number {
  return transactions
    .filter(t => t.packageId === packageId)
    .reduce((sum, t) => {
      if (t.type === 'CLOSING') return sum
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

export function getPackageType(pkg: Package): 'purchase' | 'gift' | 'compensation' | 'corporate' | 'shared' {
  if (pkg.isGift) return 'gift'
  if (pkg.isCompensation) return 'compensation'
  if (pkg.isCorporate) return 'corporate'
  if (pkg.sharedFromMemberId) return 'shared'
  return 'purchase'
}

export function getPackagePriority(pkg: Package): number {
  const type = getPackageType(pkg)
  const typePriority: Record<string, number> = {
    gift: 100,
    compensation: 90,
    shared: 80,
    corporate: 70,
    purchase: 50,
  }
  return typePriority[type] ?? 50
}

function scorePackageForDeduction(
  pkg: Package,
  courseLevelId: string,
  storeId: string,
  transactions: Transaction[],
  now: Date = new Date()
): { score: number; reasons: string[]; available: boolean } {
  const reasons: string[] = []
  let score = 0

  if (isPackageFrozen(pkg, now)) {
    return { score: -9999, reasons: ['课包已冻结'], available: false }
  }
  if (isPackageExpired(pkg, now)) {
    return { score: -9999, reasons: ['课包已过期'], available: false }
  }
  if (pkg.status !== 'active') {
    return { score: -9999, reasons: ['课包状态非激活'], available: false }
  }

  const balance = calculateBalance(pkg.id, transactions)
  if (balance <= 0) {
    return { score: -9999, reasons: ['余额不足'], available: false }
  }

  score += getPackagePriority(pkg) * 10
  const type = getPackageType(pkg)
  const typeLabels: Record<string, string> = {
    gift: '赠课优先',
    compensation: '补偿课时优先',
    shared: '共享课包',
    corporate: '企业团课',
    purchase: '购买课包',
  }
  reasons.push(typeLabels[type] ?? '购买课包')

  const levelMatch = pkg.courseLevelIds.length === 0 || pkg.courseLevelIds.includes(courseLevelId)
  if (levelMatch) {
    score += 50
    reasons.push('课程等级匹配')
  } else {
    return { score: -9999, reasons: ['课程等级不匹配'], available: false }
  }

  const storeMatch = pkg.storeIds.length === 0 || pkg.storeIds.includes(storeId)
  if (storeMatch) {
    score += 30
    reasons.push('适用门店匹配')
  } else {
    score -= 50
    reasons.push('适用门店不匹配')
  }

  const expireDate = new Date(pkg.expireDate)
  const daysUntilExpire = Math.ceil((expireDate.getTime() - now.getTime()) / 86400000)
  if (daysUntilExpire <= 7) {
    score += 40
    reasons.push(`临近到期(${daysUntilExpire}天后到期)`)
  } else if (daysUntilExpire <= 30) {
    score += 20
    reasons.push(`近期到期(${daysUntilExpire}天后到期)`)
  } else {
    reasons.push('有效期充足')
  }

  return { score, reasons, available: true }
}

export function matchPackagesForDeduction(
  memberId: string,
  courseLevelId: string,
  storeId: string,
  packages: Package[],
  transactions: Transaction[],
  requiredSessions: number = 1,
  now: Date = new Date()
): {
  matched: Package[]
  canDeduct: boolean
  reason?: string
  details: { package: Package; score: number; reasons: string[] }[]
} {
  const memberPackages = packages.filter(p => p.memberId === memberId)

  const scored = memberPackages
    .map(pkg => {
      const result = scorePackageForDeduction(pkg, courseLevelId, storeId, transactions, now)
      return { package: pkg, score: result.score, reasons: result.reasons, available: result.available }
    })
    .sort((a, b) => b.score - a.score)

  let remaining = requiredSessions
  const matched: Package[] = []

  for (const s of scored) {
    if (remaining <= 0) break
    if (!s.available) continue
    const balance = getAvailableBalance(s.package, transactions)
    if (balance > 0) {
      matched.push(s.package)
      remaining -= Math.min(balance, remaining)
    }
  }

  const details = scored.map(s => ({ package: s.package, score: s.score, reasons: s.reasons }))

  if (remaining > 0) {
    const unavailableReasons = [...new Set(scored.filter(s => !s.available).flatMap(s => s.reasons))]
    const reason = unavailableReasons.length > 0
      ? `可用课包余额不足 (${unavailableReasons.join('、')})`
      : '可用课包余额不足'
    return { matched, canDeduct: false, reason, details }
  }

  return { matched, canDeduct: true, details }
}

export function generateDeductionDetails(
  matchedPackages: Package[],
  transactions: Transaction[],
  requiredSessions: number,
  packageTypes: PackageType[]
): DeductionDetail[] {
  const details: DeductionDetail[] = []
  let remaining = requiredSessions

  for (const pkg of matchedPackages) {
    if (remaining <= 0) break
    const currentBalance = getAvailableBalance(pkg, transactions)
    const deduction = Math.min(currentBalance, remaining)
    const afterBalance = currentBalance - deduction
    const pt = packageTypes.find(p => p.id === pkg.packageTypeId)
    const pkgType = getPackageType(pkg)

    let reason = ''
    if (pkgType === 'gift') reason = '赠课优先抵扣'
    else if (pkgType === 'compensation') reason = '补偿课时抵扣'
    else if (pkgType === 'shared') reason = '共享课包抵扣'
    else if (pkgType === 'corporate') reason = '企业团课抵扣'
    else reason = '购买课包抵扣'

    details.push({
      packageId: pkg.id,
      packageName: pt?.name ?? '未知课包',
      packageType: pkgType,
      deductionAmount: deduction,
      beforeBalance: currentBalance,
      afterBalance,
      reason,
      priority: getPackagePriority(pkg),
    })

    remaining -= deduction
  }

  return details
}

export function getMemberPackageSummaries(
  memberId: string,
  packages: Package[],
  transactions: Transaction[],
  packageTypes: PackageType[],
  now: Date = new Date()
): PackageAccountSummary[] {
  return packages
    .filter(p => p.memberId === memberId)
    .map(pkg => {
      const pt = packageTypes.find(p => p.id === pkg.packageTypeId)
      const balance = calculateBalance(pkg.id, transactions)
      const pkgType = getPackageType(pkg)

      return {
        packageId: pkg.id,
        packageName: pt?.name ?? '未知课包',
        packageType: pkgType,
        totalSessions: pkg.totalSessions,
        usedSessions: pkg.totalSessions - balance,
        remainingSessions: balance,
        expireDate: pkg.expireDate,
        storeIds: pkg.storeIds,
        courseLevelIds: pkg.courseLevelIds,
        isFrozen: isPackageFrozen(pkg, now),
        isExpired: isPackageExpired(pkg, now),
        priority: getPackagePriority(pkg),
      }
    })
    .sort((a, b) => b.priority - a.priority)
}

export function explainBooking(
  memberId: string,
  courseId: string,
  courseLevelId: string,
  storeId: string,
  packages: Package[],
  transactions: Transaction[],
  packageTypes: PackageType[],
  closingPeriods: string[],
  bookingDate?: string
): BookingExplanation {
  const now = bookingDate ? new Date(bookingDate) : new Date()
  const period = bookingDate ? bookingDate.slice(0, 7) : ''
  const isLocked = closingPeriods.includes(period)

  const restrictions: string[] = []

  if (isLocked && bookingDate) {
    restrictions.push(`期间${period}已关账，该日期历史预约不可直接取消`)
  }

  const { matched, canDeduct, reason, details } = matchPackagesForDeduction(
    memberId, courseLevelId, storeId, packages, transactions, 1, now
  )

  const deductionPlan = canDeduct
    ? generateDeductionDetails(matched, transactions, 1, packageTypes)
    : []

  if (!canDeduct && reason) {
    restrictions.push(reason)
  }

  for (const d of details) {
    if (d.reasons.includes('适用门店不匹配')) {
      restrictions.push(`课包${d.package.id.slice(0, 6)}不适用该门店`)
    }
  }

  return {
    bookingId: '',
    canBook: canDeduct,
    reason: canDeduct ? undefined : reason,
    deductionPlan,
    restrictions,
    locked: isLocked,
    lockedPeriod: isLocked ? period : undefined,
  }
}

export function getRestrictionReasons(
  pkg: Package,
  courseLevelId: string,
  storeId: string,
  transactions: Transaction[]
): string[] {
  const reasons: string[] = []

  if (isPackageFrozen(pkg)) {
    reasons.push('课包已冻结')
  }
  if (isPackageExpired(pkg)) {
    reasons.push('课包已过期')
  }
  if (pkg.status !== 'active') {
    reasons.push('课包状态非激活')
  }
  if (pkg.courseLevelIds.length > 0 && !pkg.courseLevelIds.includes(courseLevelId)) {
    reasons.push('课程等级不匹配')
  }
  if (pkg.storeIds.length > 0 && !pkg.storeIds.includes(storeId)) {
    reasons.push('适用门店不匹配')
  }
  const balance = calculateBalance(pkg.id, transactions)
  if (balance <= 0) {
    reasons.push('余额不足')
  }

  return reasons
}
