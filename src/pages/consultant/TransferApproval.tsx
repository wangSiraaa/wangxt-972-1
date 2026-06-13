import { useState, useMemo } from 'react'
import { Plus, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { TransferRequest } from '@/types'

const STATUS_BADGE: Record<TransferRequest['status'], { label: string; className: string }> = {
  pending: { label: '待审批', className: 'bg-gold/20 text-gold' },
  approved: { label: '已通过', className: 'bg-emerald-700/20 text-emerald-400' },
  rejected: { label: '已驳回', className: 'bg-coral/20 text-coral' },
}

export default function TransferApproval() {
  const {
    transferRequests, packages, packageTypes, members,
    approveTransfer, rejectTransfer, createTransferRequest,
  } = useGymStore()

  const [showModal, setShowModal] = useState(false)
  const [fromMemberId, setFromMemberId] = useState('')
  const [toMemberId, setToMemberId] = useState('')
  const [packageId, setPackageId] = useState('')
  const [reason, setReason] = useState('')

  const memberMap = useMemo(() => {
    const m: Record<string, string> = {}
    members.forEach(mb => { m[mb.id] = mb.name })
    return m
  }, [members])

  const memberOnly = useMemo(() => members.filter(m => m.role === 'member'), [members])

  const fromPackages = useMemo(
    () => packages.filter(p => p.memberId === fromMemberId && p.status === 'active' && p.transferRule !== 'none'),
    [packages, fromMemberId]
  )

  const sorted = useMemo(
    () => [...transferRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [transferRequests]
  )

  const handleCreate = () => {
    if (!packageId || !fromMemberId || !toMemberId || !reason.trim()) return
    if (fromMemberId === toMemberId) return
    createTransferRequest(packageId, fromMemberId, toMemberId, reason.trim())
    setFromMemberId('')
    setToMemberId('')
    setPackageId('')
    setReason('')
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">转让审批</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950 text-gold hover:bg-emerald-900 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新建转让
        </button>
      </div>

      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left px-5 py-3 font-medium">转出会员</th>
                <th className="text-left px-5 py-3 font-medium">转入会员</th>
                <th className="text-left px-5 py-3 font-medium">课包</th>
                <th className="text-left px-5 py-3 font-medium">原因</th>
                <th className="text-left px-5 py-3 font-medium">状态</th>
                <th className="text-left px-5 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-white/30">暂无转让记录</td>
                </tr>
              )}
              {sorted.map(req => {
                const badge = STATUS_BADGE[req.status]
                const pkg = packages.find(p => p.id === req.packageId)
                const pt = pkg ? packageTypes.find(p => p.id === pkg.packageTypeId) : null
                return (
                  <tr key={req.id} className="text-white/80">
                    <td className="px-5 py-3">{memberMap[req.fromMemberId] ?? req.fromMemberId}</td>
                    <td className="px-5 py-3">{memberMap[req.toMemberId] ?? req.toMemberId}</td>
                    <td className="px-5 py-3">{pt?.name ?? req.packageId}</td>
                    <td className="px-5 py-3 text-white/50 max-w-[200px] truncate">{req.reason}</td>
                    <td className="px-5 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badge.className)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {req.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveTransfer(req.id)}
                            className="p-1.5 rounded-lg bg-emerald-700/20 text-emerald-400 hover:bg-emerald-700/40 transition-colors"
                            title="通过"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => rejectTransfer(req.id)}
                            className="p-1.5 rounded-lg bg-coral/20 text-coral hover:bg-coral/40 transition-colors"
                            title="驳回"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">新建转让</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">转出会员</label>
                <select
                  value={fromMemberId}
                  onChange={e => { setFromMemberId(e.target.value); setPackageId('') }}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
                >
                  <option value="">选择会员</option>
                  {memberOnly.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">转入会员</label>
                <select
                  value={toMemberId}
                  onChange={e => setToMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
                >
                  <option value="">选择会员</option>
                  {memberOnly.filter(m => m.id !== fromMemberId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">课包</label>
                <select
                  value={packageId}
                  onChange={e => setPackageId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
                >
                  <option value="">选择课包</option>
                  {fromPackages.map(p => {
                    const pt = packageTypes.find(pt => pt.id === p.packageTypeId)
                    return <option key={p.id} value={p.id}>{pt?.name ?? p.id}</option>
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">原因</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40"
                  placeholder="请输入转让原因"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light"
                >
                  提交转让
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
