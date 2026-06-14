import { useState, useMemo } from 'react'
import { ShieldCheck, Camera, Lock, Plus, AlertTriangle, CheckCircle2, FileText, DollarSign, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import { calculateCoachCommission, generateClosingDiffReport } from '@/engines/closingEngine'
import type { ReconciliationDiff, CommissionDiff } from '@/types'

const ADJ_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审批', cls: 'bg-gold/15 text-gold' },
  approved: { label: '已审批', cls: 'bg-emerald-700/20 text-emerald-400' },
  rejected: { label: '已拒绝', cls: 'bg-coral/15 text-coral' },
}

export default function ClosingPage() {
  const {
    closingSnapshots, packages, transactions, members, adjustmentOrders,
    coaches, bookings, courses,
    executeClosing, getReconciliationDiffs, createAdjustment, getClosingDiffReport,
  } = useGymStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7))
  const [validationResult, setValidationResult] = useState<ReconciliationDiff[] | null>(null)
  const [commissionDiffs, setCommissionDiffs] = useState<CommissionDiff[] | null>(null)
  const [lastSnapshot, setLastSnapshot] = useState<{ id: string; period: string; snapshotData: Record<string, number>; commissionSnapshot?: Record<string, number> } | null>(null)
  const [executedTxCount, setExecutedTxCount] = useState(0)
  const [hasValidated, setHasValidated] = useState(false)

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

  const periodTxs = useMemo(() => {
    const periodPrefix = `${period}-`
    return transactions.filter(t => t.createdAt.startsWith(periodPrefix))
  }, [transactions, period])

  const handleValidate = () => {
    if (!latestSnapshot) {
      setValidationResult([])
      setCurrentStep(2)
      setHasValidated(true)
      return
    }
    const diffs = getReconciliationDiffs(latestSnapshot.id)
    setValidationResult(diffs)
    setCurrentStep(2)
    setHasValidated(true)
  }

  const handleExecuteClosing = () => {
    const txBefore = transactions.length
    const snapshot = executeClosing(period)
    const txAfter = transactions.length + Object.keys(snapshot.snapshotData).length
    setLastSnapshot({ id: snapshot.id, period: snapshot.period, snapshotData: snapshot.snapshotData, commissionSnapshot: snapshot.commissionSnapshot })
    setExecutedTxCount(Object.keys(snapshot.snapshotData).length)
    const diffReport = getClosingDiffReport(snapshot.id)
    if (diffReport) {
      setCommissionDiffs(diffReport.commissionDiffs)
    }
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

  const getMemberNameByPackage = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId)
    if (!pkg) return '未知'
    return members.find(m => m.id === pkg.memberId)?.name ?? '未知'
  }

  const getPackageBalance = (packageId: string) => {
    return transactions
      .filter(t => t.packageId === packageId && t.type !== 'CLOSING')
      .reduce((s, t) => s + t.amount, 0)
  }

  return (
    <div className="space-y-6">
      <h1 className="heading-display text-2xl font-bold text-dark">月度关账</h1>

      <div className="card-dark p-5">
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center gap-3 flex-1">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                currentStep >= step.num ? 'bg-gold text-emerald-950 shadow-lg shadow-gold/20' : 'bg-white/5 text-white/30'
              )}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={cn('text-sm font-medium transition-colors', currentStep >= step.num ? 'text-white' : 'text-white/30')}>
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div className={cn('flex-1 h-px mx-4 transition-colors', currentStep > step.num ? 'bg-gold' : 'bg-white/10')} />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">关账期间</label>
            <input
              type="month"
              value={period}
              onChange={e => { setPeriod(e.target.value); setCurrentStep(1); setValidationResult(null); setLastSnapshot(null); setHasValidated(false) }}
              className="px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
          {latestSnapshot && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/10 border border-gold/20">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              <span className="text-xs text-gold">最近关账: {latestSnapshot.period} ({latestSnapshot.id.slice(0, 8)})</span>
            </div>
          )}
        </div>

        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 mb-2">
              <div className="bg-dark-light rounded-lg p-3">
                <div className="text-xs text-white/40 mb-1">本期课包</div>
                <div className="text-2xl font-display text-gold">{packages.length}</div>
              </div>
              <div className="bg-dark-light rounded-lg p-3">
                <div className="text-xs text-white/40 mb-1">本期流水</div>
                <div className="text-2xl font-display text-gold">{periodTxs.filter(t => t.type !== 'CLOSING').length}</div>
              </div>
              <div className="bg-dark-light rounded-lg p-3">
                <div className="text-xs text-white/40 mb-1">历史快照</div>
                <div className="text-2xl font-display text-gold">{closingSnapshots.length}</div>
              </div>
              <div className="bg-dark-light rounded-lg p-3">
                <div className="text-xs text-white/40 mb-1">教练佣金</div>
                <div className="text-2xl font-display text-emerald-400">
                  ¥{coaches.reduce((sum, c) => sum + calculateCoachCommission(c.id, period, bookings, courses, c.commissionRate), 0).toFixed(2)}
                </div>
              </div>
            </div>
            {!latestSnapshot && (
              <div className="bg-gold/5 border border-gold/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div className="text-sm text-gold/80">
                    尚未存在历史关账快照，校验通过后可直接执行关账生成首个快照。
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleValidate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              执行校验并继续
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
                <div className="text-xs text-coral/70 mb-3">请确认差异后再执行关账（关账后历史预约不可直接取消，需通过调整单处理）</div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-coral/60 border-b border-coral/10">
                        <th className="text-left py-1 font-medium">会员</th>
                        <th className="text-right py-1 font-medium">快照余额</th>
                        <th className="text-right py-1 font-medium">重放余额</th>
                        <th className="text-right py-1 font-medium">差异</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coral/10">
                      {validationResult.map(d => (
                        <tr key={d.packageId} className="text-coral/80">
                          <td className="py-1">{d.memberName}</td>
                          <td className="text-right py-1">{d.snapshotBalance}</td>
                          <td className="text-right py-1">{d.replayBalance}</td>
                          <td className="text-right py-1 font-medium">{d.difference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {validationResult && validationResult.length === 0 && (
              <div className="bg-emerald-700/10 border border-emerald-700/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  校验通过，无差异
                </div>
                {!latestSnapshot && (
                  <div className="text-xs text-white/50 mt-1">首次关账将生成基准快照与 {packages.length} 条 CLOSING 类型关账流水</div>
                )}
                {latestSnapshot && (
                  <div className="text-xs text-white/50 mt-1">将生成新的关账快照（基于 {latestSnapshot.period} ）</div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExecuteClosing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-emerald-950 font-medium text-sm hover:bg-gold-light transition-colors"
              >
                <Camera className="w-4 h-4" />
                执行关账
              </button>
              <button
                onClick={() => { setCurrentStep(1); setValidationResult(null); setHasValidated(false) }}
                className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
              >
                返回校验
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && lastSnapshot && (
          <div className="space-y-4">
            <div className="bg-emerald-700/10 border border-emerald-700/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-700/20 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-emerald-400 text-sm font-medium">关账完成</div>
                  <div className="text-xs text-white/40 mt-1">
                    快照ID: {lastSnapshot.id.slice(0, 20)}... · 期间: {lastSnapshot.period} · 已生成 {executedTxCount} 条 CLOSING 关账流水
                  </div>
                  <div className="text-xs text-gold/80 mt-2">
                    ⚠ 期间 {lastSnapshot.period} 已锁定，历史预约不可直接取消，如需调整请通过<span className="mx-1">调整单</span>处理
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-dark">
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 font-medium">课包ID</th>
                    <th className="text-left py-2 font-medium">会员</th>
                    <th className="text-right py-2 font-medium">快照余额</th>
                    <th className="text-right py-2 font-medium">当前重放余额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Object.entries(lastSnapshot.snapshotData).map(([pkgId, balance]) => {
                    const replay = getPackageBalance(pkgId)
                    const diff = Math.abs(balance - replay) > 0.001
                    return (
                      <tr key={pkgId} className="text-white/70">
                        <td className="py-1 font-mono text-[10px]">{pkgId.slice(0, 8)}</td>
                        <td className="py-1">{getMemberNameByPackage(pkgId)}</td>
                        <td className="text-right py-1 text-gold">{balance}</td>
                        <td className={cn('text-right py-1', diff ? 'text-coral font-medium' : '')}>{replay}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {lastSnapshot.commissionSnapshot && (
              <div className="overflow-x-auto max-h-48">
                <div className="text-sm font-medium text-white/60 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  教练佣金快照
                </div>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-dark">
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left py-2 font-medium">教练</th>
                      <th className="text-right py-2 font-medium">快照佣金</th>
                      <th className="text-right py-2 font-medium">完成课时</th>
                      <th className="text-right py-2 font-medium">佣金比例</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(lastSnapshot.commissionSnapshot).map(([coachId, commission]) => {
                      const coach = coaches.find(c => c.id === coachId)
                      const periodCompleted = bookings.filter(
                        b => b.coachId === coachId && b.datetime.startsWith(period) && b.status === 'completed'
                      ).length
                      return (
                        <tr key={coachId} className="text-white/70">
                          <td className="py-1">{coach?.name ?? coachId}</td>
                          <td className="text-right py-1 text-emerald-400">¥{commission.toFixed(2)}</td>
                          <td className="text-right py-1">{periodCompleted}节</td>
                          <td className="text-right py-1">{coach ? (coach.commissionRate * 100).toFixed(0) + '%' : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {commissionDiffs && commissionDiffs.length > 0 && (
              <div className="bg-coral/10 border border-coral/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-coral text-sm mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  佣金差异 ({commissionDiffs.length}项)
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {commissionDiffs.map(diff => (
                    <div key={diff.coachId} className="flex items-center justify-between text-xs">
                      <span className="text-white/70">{diff.coachName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white/40">快照: ¥{diff.snapshotCommission.toFixed(2)}</span>
                        <span className="text-white/40">实际: ¥{diff.actualCommission.toFixed(2)}</span>
                        <span className="text-coral font-medium">{diff.difference > 0 ? '+' : ''}{diff.difference.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setCurrentStep(1); setValidationResult(null); setLastSnapshot(null); setHasValidated(false); setExecutedTxCount(0) }}
                className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
              >
                重新关账
              </button>
              <button
                onClick={() => {
                  setAdjSnapshotId(lastSnapshot.id)
                  setShowAdjustModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/15 border border-gold/20 text-gold font-medium text-sm hover:bg-gold/25 transition-colors"
              >
                <Plus className="w-4 h-4" />
                为本次关账创建调整单
              </button>
            </div>
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
              <th className="text-left px-5 py-3 font-medium">调整明细</th>
              <th className="text-left px-5 py-3 font-medium">状态</th>
              <th className="text-left px-5 py-3 font-medium">创建时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {adjustmentOrders.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">暂无调整单。关账后如需调整历史预约或余额，请通过调整单生成 ADJUSTMENT 流水。</td></tr>
            )}
            {adjustmentOrders.map(adj => {
              const snapshot = closingSnapshots.find(s => s.id === adj.closingSnapshotId)
              const badge = ADJ_STATUS[adj.status] ?? ADJ_STATUS.pending
              return (
                <tr key={adj.id} className="text-white/70">
                  <td className="px-5 py-3">{snapshot?.period ?? adj.closingSnapshotId.slice(0, 8)}</td>
                  <td className="px-5 py-3">{adj.reason}</td>
                  <td className="px-5 py-3 text-xs text-white/50">
                    {adj.adjustmentData.map(a => `${a.packageId.slice(0, 6)}:${a.amount > 0 ? '+' : ''}${a.amount}`).join(' · ')}
                  </td>
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
                <label className="text-xs text-white/50 mb-1 block">调整原因</label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  placeholder="例如：冲销历史预约、补偿会员课时等"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">调整明细（正数补偿，负数扣减）</label>
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
                          <option key={p.id} value={p.id}>
                            {getMemberNameByPackage(p.id)} - {p.id.slice(0, 6)} (余额:{getPackageBalance(p.id)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={e => handleAdjRowChange(idx, 'amount', Number(e.target.value))}
                        placeholder="±课时"
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
                    + 添加调整行
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
                  创建调整单
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
