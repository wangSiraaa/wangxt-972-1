import { useState, useMemo } from 'react'
import { Filter, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import { calculateBalance } from '@/engines/balanceEngine'
import type { TransactionType } from '@/types'

const TX_TYPE_BADGE: Record<TransactionType, { label: string; cls: string }> = {
  POSITIVE: { label: '充值', cls: 'bg-emerald-700/20 text-emerald-400' },
  REVERSAL: { label: '冲正', cls: 'bg-blue-500/20 text-blue-400' },
  COMPENSATION: { label: '补偿', cls: 'bg-gold/15 text-gold' },
  CLOSING: { label: '关账', cls: 'bg-purple-500/20 text-purple-400' },
  ADJUSTMENT: { label: '调整', cls: 'bg-orange-500/20 text-orange-400' },
}

type FilterType = 'ALL' | TransactionType
const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'ALL', label: '全部类型' },
  { value: 'POSITIVE', label: '充值' },
  { value: 'REVERSAL', label: '冲正' },
  { value: 'COMPENSATION', label: '补偿' },
  { value: 'CLOSING', label: '关账' },
  { value: 'ADJUSTMENT', label: '调整' },
]

export default function Transactions() {
  const { transactions, packages, members, getPackageBalance } = useGymStore()

  const [filterType, setFilterType] = useState<FilterType>('ALL')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterMember, setFilterMember] = useState('')
  const [replayMember, setReplayMember] = useState('')

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'ALL' && t.type !== filterType) return false
      if (filterFrom && t.createdAt < filterFrom) return false
      if (filterTo && t.createdAt > filterTo + 'T23:59:59') return false
      if (filterMember) {
        const pkg = packages.find(p => p.id === t.packageId)
        if (!pkg || pkg.memberId !== filterMember) return false
      }
      return true
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [transactions, filterType, filterFrom, filterTo, filterMember, packages])

  const stats = useMemo(() => ({
    positive: transactions.filter(t => t.type === 'POSITIVE').length,
    reversal: transactions.filter(t => t.type === 'REVERSAL').length,
    compensation: transactions.filter(t => t.type === 'COMPENSATION').length,
  }), [transactions])

  const replayResults = useMemo(() => {
    if (!replayMember) return null
    const memberPkgs = packages.filter(p => p.memberId === replayMember)
    return memberPkgs.map(pkg => {
      const stored = getPackageBalance(pkg.id)
      const computed = calculateBalance(pkg.id, transactions)
      return {
        packageId: pkg.id,
        packageTypeName: pkg.packageTypeId,
        storedBalance: stored,
        replayBalance: computed,
        difference: stored - computed,
      }
    })
  }, [replayMember, packages, transactions, getPackageBalance])

  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name ?? '未知'

  return (
    <div className="space-y-6">
      <h1 className="heading-display text-2xl font-bold text-dark">流水台账</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-dark p-5">
          <div className="text-white/50 text-sm mb-1">充值笔数</div>
          <div className="text-2xl font-bold text-emerald-400">{stats.positive}</div>
        </div>
        <div className="card-dark p-5">
          <div className="text-white/50 text-sm mb-1">冲正笔数</div>
          <div className="text-2xl font-bold text-blue-400">{stats.reversal}</div>
        </div>
        <div className="card-dark p-5">
          <div className="text-white/50 text-sm mb-1">补偿笔数</div>
          <div className="text-2xl font-bold text-gold">{stats.compensation}</div>
        </div>
      </div>

      <div className="card-warm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Filter className="w-4 h-4 text-dark/30" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as FilterType)}
            className="px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            {FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            placeholder="开始日期"
            className="px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          />
          <span className="text-dark/30 text-sm">至</span>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            placeholder="结束日期"
            className="px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          />
          <select
            value={filterMember}
            onChange={e => setFilterMember(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            <option value="">全部会员</option>
            {members.filter(m => m.role === 'member').map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-dark overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium">时间</th>
              <th className="text-left px-5 py-3 font-medium">课包ID</th>
              <th className="text-left px-5 py-3 font-medium">流水类型</th>
              <th className="text-right px-5 py-3 font-medium">金额</th>
              <th className="text-left px-5 py-3 font-medium">描述</th>
              <th className="text-left px-5 py-3 font-medium">关联预约</th>
              <th className="text-center px-5 py-3 font-medium">是否共享</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-white/30">暂无流水记录</td></tr>
            )}
            {filtered.map(tx => {
              const typeBadge = TX_TYPE_BADGE[tx.type]
              const isPositive = tx.amount > 0
              return (
                <tr key={tx.id} className="text-white/70">
                  <td className="px-5 py-3 text-xs text-white/40">{tx.createdAt.replace('T', ' ').slice(0, 19)}</td>
                  <td className="px-5 py-3 font-mono text-xs">{tx.packageId.slice(0, 8)}</td>
                  <td className="px-5 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', typeBadge.cls)}>
                      {typeBadge.label}
                    </span>
                  </td>
                  <td className={cn('px-5 py-3 text-right font-medium', isPositive ? 'text-emerald-400' : 'text-coral')}>
                    {isPositive ? '+' : ''}{tx.amount}
                  </td>
                  <td className="px-5 py-3 text-white/50">{tx.description}</td>
                  <td className="px-5 py-3 text-xs text-white/30">{tx.bookingId ? tx.bookingId.slice(0, 8) : '-'}</td>
                  <td className="px-5 py-3 text-center">
                    {tx.isSharedDeduction ? (
                      <span className="text-gold text-xs">共享</span>
                    ) : (
                      <span className="text-white/20 text-xs">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card-dark p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-gold" />
          余额重放
        </h2>
        <div className="mb-4">
          <select
            value={replayMember}
            onChange={e => setReplayMember(e.target.value)}
            className="w-full max-w-xs px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            <option value="">选择会员进行重放</option>
            {members.filter(m => m.role === 'member').map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        {replayResults && replayResults.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left py-2 font-medium">课包ID</th>
                <th className="text-right py-2 font-medium">存储余额</th>
                <th className="text-right py-2 font-medium">重放余额</th>
                <th className="text-right py-2 font-medium">差异</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {replayResults.map(r => (
                <tr key={r.packageId} className="text-white/70">
                  <td className="py-2 font-mono text-xs">{r.packageId.slice(0, 8)}</td>
                  <td className="text-right py-2">{r.storedBalance}</td>
                  <td className="text-right py-2">{r.replayBalance}</td>
                  <td className={cn('text-right py-2 font-medium', r.difference !== 0 ? 'text-coral' : 'text-white/30')}>
                    {r.difference !== 0 ? r.difference : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {replayResults && replayResults.length === 0 && (
          <div className="text-white/30 text-sm">该会员无课包</div>
        )}
      </div>
    </div>
  )
}
