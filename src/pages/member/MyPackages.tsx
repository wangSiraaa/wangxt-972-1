import { useState, useMemo } from 'react'
import { Package as PackageIcon, ChevronRight, ChevronLeft, FlaskConical, Gift, Heart, Briefcase, ShoppingBag, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import { calculateBalance, getMemberPackageSummaries, getPackageType } from '@/engines/balanceEngine'
import type { TransactionType, PackageAccountSummary } from '@/types'

const PKG_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active: { label: '有效', cls: 'bg-emerald-700/20 text-emerald-400' },
  frozen: { label: '冻结', cls: 'bg-blue-500/20 text-blue-400' },
  expired: { label: '过期', cls: 'bg-white/10 text-white/40' },
  transferred: { label: '已转让', cls: 'bg-gold/20 text-gold' },
  refunded: { label: '已退款', cls: 'bg-coral/20 text-coral' },
}

const TX_TYPE_BADGE: Record<TransactionType, { label: string; cls: string }> = {
  POSITIVE: { label: '充值', cls: 'bg-emerald-700/20 text-emerald-400' },
  REVERSAL: { label: '冲正', cls: 'bg-blue-500/20 text-blue-400' },
  COMPENSATION: { label: '补偿', cls: 'bg-gold/15 text-gold' },
  CLOSING: { label: '关账', cls: 'bg-purple-500/20 text-purple-400' },
  ADJUSTMENT: { label: '调整', cls: 'bg-orange-500/20 text-orange-400' },
}

export default function MyPackages() {
  const {
    currentUser, packages, packageTypes, transactions, courses, courseLevels,
    getPackageBalance, simulateDeductionForBooking,
  } = useGymStore()

  const [scrollOffset, setScrollOffset] = useState(0)
  const [simCourseId, setSimCourseId] = useState('')

  const myPackages = useMemo(() => {
    if (!currentUser) return []
    return packages.filter(p => p.memberId === currentUser.id)
  }, [packages, currentUser])

  const myTransactions = useMemo(() => {
    if (!currentUser) return []
    const myPkgIds = new Set(myPackages.map(p => p.id))
    return transactions
      .filter(t => myPkgIds.has(t.packageId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [transactions, myPackages, currentUser])

  const simResult = useMemo(() => {
    if (!currentUser || !simCourseId) return null
    const course = courses.find(c => c.id === simCourseId)
    if (!course) return null
    return simulateDeductionForBooking(currentUser.id, simCourseId, course.storeId)
  }, [currentUser, simCourseId, simulateDeductionForBooking, courses])

  const packageSummaries = useMemo(() => {
    if (!currentUser) return [] as PackageAccountSummary[]
    return getMemberPackageSummaries(currentUser.id, packages, transactions, packageTypes)
  }, [currentUser, packages, transactions, packageTypes])

  const typeSummary = useMemo(() => {
    const groups: Record<string, { name: string; count: number; balance: number }> = {
      purchase: { name: '购买课包', count: 0, balance: 0 },
      gift: { name: '赠课', count: 0, balance: 0 },
      compensation: { name: '补偿课时', count: 0, balance: 0 },
      corporate: { name: '企业团课', count: 0, balance: 0 },
      shared: { name: '家庭共享', count: 0, balance: 0 },
    }
    packageSummaries.forEach(s => {
      const group = groups[s.packageType]
      if (group) {
        group.count++
        group.balance += s.remainingSessions
      }
    })
    return Object.entries(groups).filter(([, g]) => g.count > 0).map(([type, g]) => ({ type, ...g }))
  }, [packageSummaries])

  const totalBalance = useMemo(() => {
    return packageSummaries.reduce((sum, s) => sum + s.remainingSessions, 0)
  }, [packageSummaries])

  const getExpireCountdown = (expireDate: string) => {
    const diff = Math.ceil((new Date(expireDate).getTime() - Date.now()) / 86400000)
    if (diff < 0) return '已过期'
    if (diff === 0) return '今天到期'
    return `${diff}天`
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark/30">请先登录</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="heading-display text-2xl font-bold text-dark">我的课包</h1>

      <div className="grid grid-cols-5 gap-3">
        <div className="card-dark p-4 text-center">
          <div className="text-3xl font-bold text-gold mb-1">{totalBalance}</div>
          <div className="text-xs text-white/40">总余额</div>
        </div>
        {typeSummary.slice(0, 4).map(item => {
          const IconComp = item.type === 'gift' ? Gift :
            item.type === 'compensation' ? Heart :
            item.type === 'corporate' ? Briefcase :
            item.type === 'shared' ? Users : ShoppingBag
          return (
            <div key={item.type} className="card-dark p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <IconComp className="w-4 h-4 text-gold" />
                <span className="text-xs text-white/50">{item.name}</span>
              </div>
              <div className="text-2xl font-bold text-white">{item.balance}</div>
              <div className="text-xs text-white/30 mt-1">{item.count}个课包</div>
            </div>
          )
        })}
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
          {myPackages.map(pkg => {
            const pt = packageTypes.find(p => p.id === pkg.packageTypeId)
            const balance = getPackageBalance(pkg.id)
            const badge = PKG_STATUS_BADGE[pkg.status] ?? PKG_STATUS_BADGE.active
            return (
              <div key={pkg.id} className="card-dark p-5 min-w-[240px] shrink-0 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PackageIcon className="w-4 h-4 text-gold" />
                    <span className="text-white/70 text-sm font-medium">{pt?.name ?? '未知课包'}</span>
                  </div>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badge.cls)}>
                    {badge.label}
                  </span>
                </div>
                <div className="text-4xl font-bold text-gold mb-1">{balance}</div>
                <div className="text-white/30 text-xs mb-3">总课时: {pkg.totalSessions}</div>
                <div className="text-white/40 text-xs">到期: {pkg.expireDate}</div>
                <div className={cn('text-xs mt-1', new Date(pkg.expireDate) < new Date() ? 'text-coral' : 'text-white/30')}>
                  {getExpireCountdown(pkg.expireDate)}
                </div>
                {pkg.isShared && (
                  <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gold/10 text-gold w-fit">
                    共享{pkg.sharedFromMemberId ? ` (来自${pkg.sharedFromMemberId})` : ''}
                  </span>
                )}
                {pkg.isGift && (
                  <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gold/10 text-gold w-fit">
                    赠课
                  </span>
                )}
                {pkg.status === 'frozen' && pkg.freezeStart && pkg.freezeEnd && (
                  <div className="text-blue-400 text-xs mt-2">
                    冻结: {pkg.freezeStart} ~ {pkg.freezeEnd}
                  </div>
                )}
              </div>
            )
          })}
          {myPackages.length === 0 && (
            <div className="text-white/30 py-12 text-center w-full">暂无课包</div>
          )}
        </div>
      </div>

      <div className="card-dark p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-gold" />
          余额推演
        </h2>
        <div className="mb-4">
          <select
            value={simCourseId}
            onChange={e => setSimCourseId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            <option value="">选择课程进行推演</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {simResult && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/10">
                  <th className="text-left py-2 font-medium">课包</th>
                  <th className="text-right py-2 font-medium">扣减前</th>
                  <th className="text-right py-2 font-medium">扣减</th>
                  <th className="text-right py-2 font-medium">扣减后</th>
                  <th className="text-right py-2 font-medium">差额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {simResult.matchedPackages.map(mp => (
                  <tr key={mp.packageId} className="text-white/70">
                    <td className="py-2">
                      {mp.packageTypeName}
                      {mp.isGift && <span className="ml-1 text-gold text-xs">赠</span>}
                    </td>
                    <td className="text-right py-2">{mp.currentBalance}</td>
                    <td className="text-right py-2">-{mp.deductionAmount}</td>
                    <td className="text-right py-2">{mp.afterBalance}</td>
                    <td className="text-right py-2 text-gold font-medium">-{mp.deductionAmount}</td>
                  </tr>
                ))}
                {simResult.matchedPackages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-coral text-xs">
                      {simResult.reason ?? '无可用课包'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-dark overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">流水记录</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium">时间</th>
              <th className="text-left px-5 py-3 font-medium">类型</th>
              <th className="text-right px-5 py-3 font-medium">金额</th>
              <th className="text-left px-5 py-3 font-medium">描述</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {myTransactions.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-white/30">暂无流水</td></tr>
            )}
            {myTransactions.map(tx => {
              const typeBadge = TX_TYPE_BADGE[tx.type]
              const isPositive = tx.amount > 0
              return (
                <tr key={tx.id} className="text-white/70">
                  <td className="px-5 py-3 text-xs text-white/40">{tx.createdAt.replace('T', ' ').slice(0, 19)}</td>
                  <td className="px-5 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', typeBadge.cls)}>
                      {typeBadge.label}
                    </span>
                  </td>
                  <td className={cn('px-5 py-3 text-right font-medium', isPositive ? 'text-emerald-400' : 'text-coral')}>
                    {isPositive ? '+' : ''}{tx.amount}
                  </td>
                  <td className="px-5 py-3 text-white/50">{tx.description}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
