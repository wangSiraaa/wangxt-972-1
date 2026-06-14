import { useState, useMemo } from 'react'
import { Plus, Snowflake, Sun, Gift, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { Package } from '@/types'

const STATUS_OPTIONS: { key: Package['status'] | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '有效' },
  { key: 'frozen', label: '冻结' },
  { key: 'expired', label: '过期' },
  { key: 'refunded', label: '已退款' },
]

const STATUS_BADGE: Record<Package['status'], { label: string; className: string }> = {
  active: { label: '有效', className: 'bg-emerald-700/20 text-emerald-400' },
  frozen: { label: '冻结', className: 'bg-blue-500/20 text-blue-400' },
  expired: { label: '过期', className: 'bg-white/10 text-white/40' },
  transferred: { label: '已转让', className: 'bg-gold/20 text-gold' },
  refunded: { label: '已退款', className: 'bg-coral/20 text-coral' },
}

type ModalType = 'none' | 'freeze' | 'gift' | 'add'

export default function PackageManage() {
  const {
    packages, packageTypes, members, getPackageBalance,
    freezePackage, unfreezePackage, addPackage,
  } = useGymStore()

  const [statusFilter, setStatusFilter] = useState<Package['status'] | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [modalType, setModalType] = useState<ModalType>('none')
  const [selectedPkgId, setSelectedPkgId] = useState<string>('')
  const [freezeStart, setFreezeStart] = useState('')
  const [freezeEnd, setFreezeEnd] = useState('')
  const [giftMemberId, setGiftMemberId] = useState('')
  const [giftSessionCount, setGiftSessionCount] = useState(5)
  const [giftExpireDate, setGiftExpireDate] = useState('')
  const [addMemberId, setAddMemberId] = useState('')
  const [addPkgTypeId, setAddPkgTypeId] = useState('')
  const [addExpireDate, setAddExpireDate] = useState('')

  const memberMap = useMemo(() => {
    const m: Record<string, string> = {}
    members.forEach(mb => { m[mb.id] = mb.name })
    return m
  }, [members])

  const memberOnly = useMemo(() => members.filter(m => m.role === 'member'), [members])

  const filtered = useMemo(() => {
    return packages.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (typeFilter !== 'all' && p.packageTypeId !== typeFilter) return false
      return true
    })
  }, [packages, statusFilter, typeFilter])

  const giftPkgType = useMemo(() => packageTypes.find(pt => pt.isGift), [packageTypes])

  const openFreezeModal = (pkgId: string) => {
    setSelectedPkgId(pkgId)
    setFreezeStart('')
    setFreezeEnd('')
    setModalType('freeze')
  }

  const handleFreeze = () => {
    if (!selectedPkgId || !freezeStart || !freezeEnd) return
    freezePackage(selectedPkgId, freezeStart, freezeEnd)
    setModalType('none')
  }

  const handleUnfreeze = (pkgId: string) => {
    unfreezePackage(pkgId)
  }

  const openGiftModal = () => {
    setGiftMemberId('')
    setGiftSessionCount(5)
    setGiftExpireDate('')
    setModalType('gift')
  }

  const handleGift = () => {
    if (!giftMemberId || !giftExpireDate) return
    addPackage({
      memberId: giftMemberId,
      packageTypeId: giftPkgType?.id ?? packageTypes[0]?.id ?? '',
      totalSessions: giftSessionCount,
      expireDate: giftExpireDate,
      isShared: false,
      sharedQuota: 0,
      isGift: true,
      isCompensation: false,
      isCorporate: false,
      storeIds: [],
      transferRule: 'none',
      refundRule: 'none',
      courseLevelIds: giftPkgType?.courseLevelIds ?? [],
    })
    setModalType('none')
  }

  const openAddModal = () => {
    setAddMemberId('')
    setAddPkgTypeId('')
    setAddExpireDate('')
    setModalType('add')
  }

  const handleAdd = () => {
    if (!addMemberId || !addPkgTypeId || !addExpireDate) return
    const pt = packageTypes.find(p => p.id === addPkgTypeId)
    if (!pt) return
    addPackage({
      memberId: addMemberId,
      packageTypeId: addPkgTypeId,
      totalSessions: pt.sessionCount,
      expireDate: addExpireDate,
      isShared: pt.allowShare,
      sharedQuota: 0,
      isGift: false,
      isCompensation: false,
      isCorporate: false,
      storeIds: [],
      transferRule: pt.allowTransfer ? 'allowed' : 'none',
      refundRule: pt.refundRule,
      courseLevelIds: pt.courseLevelIds,
    })
    setModalType('none')
  }

  const renderModal = () => {
    if (modalType === 'none') return null

    let title = ''
    let content: React.ReactNode = null

    if (modalType === 'freeze') {
      title = '冻结课包'
      content = (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">冻结开始日期</label>
            <input
              type="date"
              value={freezeStart}
              onChange={e => setFreezeStart(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">冻结结束日期</label>
            <input
              type="date"
              value={freezeEnd}
              onChange={e => setFreezeEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalType('none')} className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm">取消</button>
            <button onClick={handleFreeze} className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light">确认冻结</button>
          </div>
        </div>
      )
    }

    if (modalType === 'gift') {
      title = '赠送课时'
      content = (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">赠送会员</label>
            <select
              value={giftMemberId}
              onChange={e => setGiftMemberId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">选择会员</option>
              {memberOnly.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">赠送次数</label>
            <input
              type="number"
              min={1}
              value={giftSessionCount}
              onChange={e => setGiftSessionCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">到期日期</label>
            <input
              type="date"
              value={giftExpireDate}
              onChange={e => setGiftExpireDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalType('none')} className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm">取消</button>
            <button onClick={handleGift} className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light">确认赠送</button>
          </div>
        </div>
      )
    }

    if (modalType === 'add') {
      title = '新增课包'
      content = (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">会员</label>
            <select
              value={addMemberId}
              onChange={e => setAddMemberId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">选择会员</option>
              {memberOnly.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">课包类型</label>
            <select
              value={addPkgTypeId}
              onChange={e => setAddPkgTypeId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              <option value="">选择课包类型</option>
              {packageTypes.filter(pt => !pt.isGift).map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">到期日期</label>
            <input
              type="date"
              value={addExpireDate}
              onChange={e => setAddExpireDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalType('none')} className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm">取消</button>
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light">确认添加</button>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalType('none')}>
        <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
          <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">课包管理</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={openGiftModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark text-gold border border-gold/30 hover:border-gold transition-colors text-sm font-medium"
          >
            <Gift className="w-4 h-4" />
            赠课
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950 text-gold hover:bg-emerald-900 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            新增课包
          </button>
        </div>
      </div>

      <div className="card-warm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-1 bg-warm-100 rounded-lg p-1">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm transition-colors',
                  statusFilter === opt.key
                    ? 'bg-emerald-950 text-gold font-medium'
                    : 'text-dark/50 hover:text-dark/70'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            <option value="all">全部类型</option>
            {packageTypes.map(pt => (
              <option key={pt.id} value={pt.id}>{pt.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left px-5 py-3 font-medium">会员</th>
                <th className="text-left px-5 py-3 font-medium">课包类型</th>
                <th className="text-left px-5 py-3 font-medium">余额</th>
                <th className="text-left px-5 py-3 font-medium">到期日</th>
                <th className="text-left px-5 py-3 font-medium">状态</th>
                <th className="text-left px-5 py-3 font-medium">冻结期</th>
                <th className="text-left px-5 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(pkg => {
                const badge = STATUS_BADGE[pkg.status]
                const pt = packageTypes.find(p => p.id === pkg.packageTypeId)
                return (
                  <tr key={pkg.id} className="text-white/80">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {memberMap[pkg.memberId] ?? pkg.memberId}
                        {pkg.isShared && <Users className="w-3.5 h-3.5 text-gold" />}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {pt?.name ?? pkg.packageTypeId}
                        {pkg.isGift && <Gift className="w-3.5 h-3.5 text-gold" />}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gold font-medium">{getPackageBalance(pkg.id)}</td>
                    <td className="px-5 py-3 text-white/50">{pkg.expireDate}</td>
                    <td className="px-5 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badge.className)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs">
                      {pkg.freezeStart && pkg.freezeEnd ? `${pkg.freezeStart} ~ ${pkg.freezeEnd}` : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {pkg.status === 'active' && (
                          <button
                            onClick={() => openFreezeModal(pkg.id)}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                            title="冻结"
                          >
                            <Snowflake className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {pkg.status === 'frozen' && (
                          <button
                            onClick={() => handleUnfreeze(pkg.id)}
                            className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                            title="解冻"
                          >
                            <Sun className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {renderModal()}
    </div>
  )
}
