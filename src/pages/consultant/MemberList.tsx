import { Fragment, useState, useMemo } from 'react'
import { Search, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { UserRole, Package } from '@/types'

const ROLE_TABS: { key: UserRole | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'member', label: '会员' },
  { key: 'consultant', label: '顾问' },
  { key: 'coach', label: '教练' },
  { key: 'finance', label: '财务' },
]

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  member: { label: '会员', className: 'bg-emerald-700/20 text-emerald-400' },
  consultant: { label: '顾问', className: 'bg-gold/20 text-gold' },
  coach: { label: '教练', className: 'bg-blue-500/20 text-blue-400' },
  finance: { label: '财务', className: 'bg-purple-500/20 text-purple-400' },
}

const PKG_STATUS_BADGE: Record<Package['status'], { label: string; className: string }> = {
  active: { label: '有效', className: 'bg-emerald-700/20 text-emerald-400' },
  frozen: { label: '冻结', className: 'bg-blue-500/20 text-blue-400' },
  expired: { label: '过期', className: 'bg-white/10 text-white/40' },
  transferred: { label: '已转让', className: 'bg-gold/20 text-gold' },
  refunded: { label: '已退款', className: 'bg-coral/20 text-coral' },
}

export default function MemberList() {
  const { members, packages, packageTypes, getPackageBalance, addMember } = useGymStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('member')

  const filtered = useMemo(() => {
    return members.filter(m => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return m.name.toLowerCase().includes(q) || m.phone.includes(q)
      }
      return true
    })
  }, [members, roleFilter, search])

  const getMemberPkgCount = (memberId: string) =>
    packages.filter(p => p.memberId === memberId).length

  const getMemberTotalBalance = (memberId: string) =>
    packages
      .filter(p => p.memberId === memberId && p.status === 'active')
      .reduce((sum, p) => sum + getPackageBalance(p.id), 0)

  const getMemberPackages = (memberId: string) =>
    packages.filter(p => p.memberId === memberId)

  const handleAddMember = () => {
    if (!formName.trim() || !formPhone.trim()) return
    addMember({ name: formName.trim(), phone: formPhone.trim(), role: formRole })
    setFormName('')
    setFormPhone('')
    setFormRole('member')
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">会员管理</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950 text-gold hover:bg-emerald-900 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增会员
        </button>
      </div>

      <div className="card-warm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark/30" />
            <input
              type="text"
              placeholder="搜索姓名/手机号..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
          <div className="flex items-center gap-1 bg-warm-100 rounded-lg p-1">
            {ROLE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm transition-colors',
                  roleFilter === tab.key
                    ? 'bg-emerald-950 text-gold font-medium'
                    : 'text-dark/50 hover:text-dark/70'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card-dark overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium w-8"></th>
              <th className="text-left px-5 py-3 font-medium">姓名</th>
              <th className="text-left px-5 py-3 font-medium">手机号</th>
              <th className="text-left px-5 py-3 font-medium">角色</th>
              <th className="text-left px-5 py-3 font-medium">课包数</th>
              <th className="text-left px-5 py-3 font-medium">总余额</th>
              <th className="text-left px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(m => {
              const isExpanded = expandedId === m.id
              const memberPkgs = isExpanded ? getMemberPackages(m.id) : []
              return (
                <Fragment key={m.id}>
                  <tr
                    className="text-white/80 hover:bg-dark-light/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  >
                    <td className="px-5 py-3">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-white/30" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white/30" />
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium">{m.name}</td>
                    <td className="px-5 py-3 text-white/50">{m.phone}</td>
                    <td className="px-5 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', ROLE_BADGE[m.role].className)}>
                        {ROLE_BADGE[m.role].label}
                      </span>
                    </td>
                    <td className="px-5 py-3">{getMemberPkgCount(m.id)}</td>
                    <td className="px-5 py-3 text-gold font-medium">{getMemberTotalBalance(m.id)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : m.id) }}
                        className="text-xs text-gold hover:text-gold-light transition-colors"
                      >
                        查看课包
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="px-5 py-3 bg-dark-light/30">
                        <div className="space-y-2">
                          {memberPkgs.length === 0 && (
                            <p className="text-white/30 text-xs">暂无课包</p>
                          )}
                          {memberPkgs.map(pkg => {
                            const pt = packageTypes.find(pt => pt.id === pkg.packageTypeId)
                            const badge = PKG_STATUS_BADGE[pkg.status]
                            return (
                              <div key={pkg.id} className="flex items-center gap-4 bg-dark-light rounded-lg px-4 py-2.5 text-xs">
                                <span className="text-white/70 font-medium">{pt?.name ?? pkg.packageTypeId}</span>
                                <span className="text-gold">余额: {getPackageBalance(pkg.id)}</span>
                                <span className="text-white/40">到期: {pkg.expireDate}</span>
                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badge.className)}>
                                  {badge.label}
                                </span>
                                {pkg.isShared && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gold/10 text-gold">
                                    共享
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">新增会员</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">姓名</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">手机号</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">角色</label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                >
                  <option value="member">会员</option>
                  <option value="consultant">顾问</option>
                  <option value="coach">教练</option>
                  <option value="finance">财务</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddMember}
                  className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light transition-colors"
                >
                  确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
