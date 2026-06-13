import { useState, useMemo } from 'react'
import { Download, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import { calculateBalance } from '@/engines/balanceEngine'
import type { ReconciliationDiff } from '@/types'

export default function Reconciliation() {
  const { closingSnapshots, packages, transactions, members, getReconciliationDiffs } = useGymStore()

  const [selectedSnapshot, setSelectedSnapshot] = useState('')
  const [diffs, setDiffs] = useState<ReconciliationDiff[]>([])
  const [replayResults, setReplayResults] = useState<{ packageId: string; storedBalance: number; replayBalance: number; difference: number }[] | null>(null)

  const snapshot = useMemo(
    () => closingSnapshots.find(s => s.id === selectedSnapshot),
    [closingSnapshots, selectedSnapshot]
  )

  const handleCompare = () => {
    if (!selectedSnapshot) return
    const result = getReconciliationDiffs(selectedSnapshot)
    setDiffs(result)
  }

  const matchedCount = useMemo(() => {
    if (!snapshot) return 0
    const allPkgIds = Object.keys(snapshot.snapshotData)
    return allPkgIds.length - diffs.length
  }, [snapshot, diffs])

  const totalCount = snapshot ? Object.keys(snapshot.snapshotData).length : 0

  const handleExport = () => {
    if (diffs.length === 0) return
    const lines = [
      '课包ID,会员,快照余额,重放余额,差异',
      ...diffs.map(d => `${d.packageId},${d.memberName},${d.snapshotBalance},${d.replayBalance},${d.difference}`)
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reconciliation_diffs_${selectedSnapshot.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReplay = () => {
    if (!snapshot) return
    const results = Object.entries(snapshot.snapshotData).map(([packageId, snapshotBalance]) => {
      const replayBalance = calculateBalance(packageId, transactions)
      return {
        packageId,
        storedBalance: snapshotBalance,
        replayBalance,
        difference: snapshotBalance - replayBalance,
      }
    })
    setReplayResults(results)
  }

  return (
    <div className="space-y-6">
      <h1 className="heading-display text-2xl font-bold text-dark">对账</h1>

      <div className="card-warm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={selectedSnapshot}
            onChange={e => setSelectedSnapshot(e.target.value)}
            className="px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            <option value="">选择关账快照</option>
            {closingSnapshots.map(s => (
              <option key={s.id} value={s.id}>{s.period} - {s.id.slice(0, 8)}</option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={!selectedSnapshot}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              selectedSnapshot
                ? 'bg-emerald-950 text-gold hover:bg-emerald-900'
                : 'bg-warm-200 text-dark/30 cursor-not-allowed'
            )}
          >
            对比
          </button>
        </div>
      </div>

      {selectedSnapshot && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-dark p-5">
            <div className="text-white/50 text-sm mb-1">总课包数</div>
            <div className="text-3xl font-bold text-white">{totalCount}</div>
          </div>
          <div className="card-dark p-5">
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
              <CheckCircle2 className="w-4 h-4" />
              一致
            </div>
            <div className="text-3xl font-bold text-emerald-400">{matchedCount}</div>
          </div>
          <div className="card-dark p-5">
            <div className="flex items-center gap-2 text-coral text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              不一致
            </div>
            <div className="text-3xl font-bold text-coral">{diffs.length}</div>
          </div>
        </div>
      )}

      <div className="card-dark overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-semibold">对比结果</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={diffs.length === 0}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                diffs.length > 0
                  ? 'bg-gold text-emerald-950 hover:bg-gold-light'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              )}
            >
              <Download className="w-3 h-3" />
              导出差异清单
            </button>
            <button
              onClick={handleReplay}
              disabled={!selectedSnapshot}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                selectedSnapshot
                  ? 'border border-white/10 text-white/70 hover:text-white hover:border-white/20'
                  : 'border border-white/5 text-white/20 cursor-not-allowed'
              )}
            >
              <RefreshCw className="w-3 h-3" />
              流水重放校验
            </button>
          </div>
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
            {!selectedSnapshot && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">请选择快照</td></tr>
            )}
            {selectedSnapshot && diffs.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">无差异</td></tr>
            )}
            {diffs.map(d => (
              <tr key={d.packageId} className="text-white/70">
                <td className="px-5 py-3 font-mono text-xs">{d.packageId.slice(0, 8)}</td>
                <td className="px-5 py-3">{d.memberName}</td>
                <td className="text-right px-5 py-3">{d.snapshotBalance}</td>
                <td className="text-right px-5 py-3">{d.replayBalance}</td>
                <td className={cn('text-right px-5 py-3 font-medium', d.difference !== 0 ? 'text-coral' : 'text-white/30')}>
                  {d.difference !== 0 ? d.difference : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {replayResults && (
        <div className="card-dark overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-gold" />
              流水重放校验结果
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left px-5 py-3 font-medium">课包ID</th>
                <th className="text-right px-5 py-3 font-medium">快照余额</th>
                <th className="text-right px-5 py-3 font-medium">重放余额</th>
                <th className="text-right px-5 py-3 font-medium">差异</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {replayResults.map(r => (
                <tr key={r.packageId} className="text-white/70">
                  <td className="px-5 py-3 font-mono text-xs">{r.packageId.slice(0, 8)}</td>
                  <td className="text-right px-5 py-3">{r.storedBalance}</td>
                  <td className="text-right px-5 py-3">{r.replayBalance}</td>
                  <td className={cn('text-right px-5 py-3 font-medium', r.difference !== 0 ? 'text-coral' : 'text-white/30')}>
                    {r.difference !== 0 ? r.difference : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
