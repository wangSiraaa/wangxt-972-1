import { useState, useMemo } from 'react'
import { ShieldCheck, Camera, Lock, Plus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { ReconciliationDiff } from '@/types'

const ADJ_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审批', cls: 'bg-gold/15 text-gold' },
  approved: { label: '已审批', cls: 'bg-emerald-700/20 text-emerald-400' },
  rejected: { label: '已拒绝', cls: 'bg-coral/15 text-coral' },
}

export default function ClosingPage() {
  const {
    closingSnapshots, packages, transactions, members, adjustmentOrders,
    executeClosing, getReconciliationDiffs, createAdjustment,
  } = useGymStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7))
  const [validationResult, setValidationResult] = useState<ReconciliationDiff[] | null>(null)
  const [lastSnapshot, setLastSnapshot] = useState<{ id: string; period: string; snapshotData: Record<string, number> } | null>(null)

  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjSnapshotId, setAdjSnapshotId] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [adjRows, setAdjRows] = useState<{ packageId: string; amount: number }[]>([{ packageId: '', amount: 0 }])

  const steps = [
    { num: 1, label: '关账前校验', icon: ShieldCheck },
    { num: 2, label: '生成快照', icon: Camera },
    { num: 3, label: '关账锁定', icon: Lock },
  ]

  const latestSnapshot = useMemo(() => {
    return closingSnapshots[closingSnapshots.length - 1] ?? null
  }, [closingSnapshots])

  const handleValidate = () => {
    if (!latestSnapshot) {
      setValidationResult([])
      return
    }
    const diffs = getReconciliationDiffs(latestSnapshot.id)
    setValidationResult(diffs)
    setCurrentStep(2)
  }

  const handleExecuteClosing = () => {
    const snapshot = executeClosing(period)
    setLastSnapshot({ id: snapshot.id, period: snapshot.period, snapshotData: snapshot.snapshotData })
    setCurrentStep(3)
  }

  const handleAddAdjRow = () => {
    setAdjRows([...adjRows, { packageId: '', amount: 0 }])
  }

  const handleRemoveAdjRow = (idx: number) => {
    setAdjRows(adjRows.filter((_, i) => i !== idx))
  }

  const handleAdjRowChange = (idx: number, field: 'packageId' | 'amount', value: string | number) => {
    const updated = [...adjRows]
    updated[idx] = { ...updated[idx], [field]: value }
    setAdjRows(updated)
  }

  const handleCreateAdjustment = () => {
    if (!adjSnapshotId || !adjReason) return
    const validRows = adjRows.filter(r => r.packageId && r.amount !== 0)
    if (validRows.length === 0) return
    createAdjustment(adjSnapshotId, adjReason, validRows)
    setShowAdjustModal(false)
    setAdjReason('')
    setAdjRows([{ packageId: '', amount: 0 }])
  }

  return (
    <div className="space-y-6">
      <h1 className="heading-display text-2xl font-bold text-dark">月度关账</h1>

      <div className="card-dark p-5">
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center gap-3 flex-1">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                currentStep >= step.num ? 'bg-gold text-emerald-950' : 'bg-white/5 text-white/30'
              )}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={cn('text-sm font-medium', currentStep >= step.num ? 'text-white' : 'text-white/30')}>
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div className={cn('flex-1 h-px mx-4', currentStep > step.num ? 'bg-gold' : 'bg-white/10')} />
              )}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="text-xs text-white/50 mb-1 block">关账期间</label>
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          />
        </div>

        {currentStep === 1 && (
          <div>
            <button
              onClick={handleValidate}
              className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light transition-colors"
            >
              校验
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            {validationResult && validationResult.length > 0 && (
              <div className="bg-coral/10 border border-coral/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-coral text-sm mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  存在 {validationResult.length} 项差异
                </div>
                <div className="text-xs text-coral/70">请确认差异后再执行关账</div>
              </div>
            )}
            {validationResult && validationResult.length === 0 && (
              <div className="bg-emerald-700/10 border border-emerald-700/20 rounded-lg p-4">
                <div className="text-emerald-400 text-sm">校验通过，无差异</div>
              </div>
            )}
            <button
              onClick={handleExecuteClosing}
              className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light transition-colors"
            >
              执行关账
            </button>
          </div>
        )}

        {currentStep === 3 && lastSnapshot && (
          <div className="space-y-4">
            <div className="bg-emerald-700/10 border border-emerald-700/20 rounded-lg p-4">
              <div className="text-emerald-400 text-sm font-medium">关账完成</div>
              <div className="text-xs text-white/40 mt-1">快照ID: {lastSnapshot.id.slice(0, 12)}...</div>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 font-medium">课包ID</th>
                    <th className="text-right py-2 font-medium">快照余额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Object.entries(lastSnapshot.snapshotData).map(([pkgId, balance]) => (
                    <tr key={pkgId} className="text-white/70">
                      <td className="py-1 font-mono">{pkgId.slice(0, 8)}</td>
                      <td className="text-right py-1">{balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => { setCurrentStep(1); setValidationResult(null); setLastSnapshot(null) }}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
            >
              重新关账
            </button>
          </div>
        )}
      </div>

      <div className="card-dark overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-semibold">调整单</h2>
          <button
            onClick={() => {
              setAdjSnapshotId(latestSnapshot?.id ?? '')
              setShowAdjustModal(true)
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold text-emerald-950 font-medium text-xs hover:bg-gold-light transition-colors"
          >
            <Plus className="w-3 h-3" />
            新建调整单
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium">期间</th>
              <th className="text-left px-5 py-3 font-medium">原因</th>
              <th className="text-left px-5 py-3 font-medium">状态</th>
              <th className="text-left px-5 py-3 font-medium">创建时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {adjustmentOrders.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-white/30">暂无调整单</td></tr>
            )}
            {adjustmentOrders.map(adj => {
              const badge = ADJ_STATUS[adj.status] ?? ADJ_STATUS.pending
              return (
                <tr key={adj.id} className="text-white/70">
                  <td className="px-5 py-3">{adj.closingSnapshotId.slice(0, 8)}</td>
                  <td className="px-5 py-3">{adj.reason}</td>
                  <td className="px-5 py-3">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', badge.cls)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-white/40">{adj.createdAt.replace('T', ' ').slice(0, 19)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {validationResult && validationResult.length > 0 && (
        <div className="card-dark overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-coral" />
              差异清单
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left px-5 py-3 font-medium">课包ID</th>
                <th className="text-left px-5 py-3 font-medium">会员</th>
                <th className="text-right px-5 py-3 font-medium">快照余额</th>
                <th className="text-right px-5 py-3 font-medium">重放余额</th>
                <th className="text-right px-5 py-3 font-medium">差异</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {validationResult.map(d => (
                <tr key={d.packageId} className="text-white/70">
                  <td className="px-5 py-3 font-mono text-xs">{d.packageId.slice(0, 8)}</td>
                  <td className="px-5 py-3">{d.memberName}</td>
                  <td className="text-right px-5 py-3">{d.snapshotBalance}</td>
                  <td className="text-right px-5 py-3">{d.replayBalance}</td>
                  <td className="text-right px-5 py-3 text-coral font-medium">{d.difference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAdjustModal(false)}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">新建调整单</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">关账快照</label>
                <select
                  value={adjSnapshotId}
                  onChange={e => setAdjSnapshotId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                >
                  <option value="">选择快照</option>
                  {closingSnapshots.map(s => (
                    <option key={s.id} value={s.id}>{s.period} ({s.id.slice(0, 8)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">原因</label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">调整明细</label>
                <div className="space-y-2">
                  {adjRows.map((row, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={row.packageId}
                        onChange={e => handleAdjRowChange(idx, 'packageId', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                      >
                        <option value="">选择课包</option>
                        {packages.map(p => (
                          <option key={p.id} value={p.id}>{p.id.slice(0, 8)}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={e => handleAdjRowChange(idx, 'amount', Number(e.target.value))}
                        className="w-24 px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                      />
                      {adjRows.length > 1 && (
                        <button
                          onClick={() => handleRemoveAdjRow(idx)}
                          className="px-2 text-coral hover:bg-coral/10 rounded-lg transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddAdjRow}
                    className="text-xs text-gold hover:text-gold-light transition-colors"
                  >
                    + 添加行
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateAdjustment}
                  className="px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light transition-colors"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
