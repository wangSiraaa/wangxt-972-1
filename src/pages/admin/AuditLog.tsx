import { useState, useMemo } from 'react'
import { Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { UserRole } from '@/types'

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  member: { label: '会员', className: 'bg-emerald-700/20 text-emerald-400' },
  consultant: { label: '顾问', className: 'bg-gold/20 text-gold' },
  coach: { label: '教练', className: 'bg-blue-500/20 text-blue-400' },
  finance: { label: '财务', className: 'bg-purple-500/20 text-purple-400' },
}

const ACTION_TYPES = [
  'CREATE', 'BOOK', 'CANCEL_BOOKING', 'FREEZE', 'UNFREEZE',
  'APPROVE_LEAVE', 'CLOSING', 'TRANSFER',
]

const PAGE_SIZE = 20

function JsonDiff({ before, after }: { before?: string; after?: string }) {
  let beforeObj: Record<string, unknown> = {}
  let afterObj: Record<string, unknown> = {}
  try { if (before) beforeObj = JSON.parse(before) } catch { /* */ }
  try { if (after) afterObj = JSON.parse(after) } catch { /* */ }

  const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]))

  return (
    <div className="grid grid-cols-2 gap-4 text-xs">
      <div>
        <div className="text-coral font-medium mb-1">变更前</div>
        <pre className="bg-dark-lighter rounded p-2 text-white/60 overflow-auto max-h-40 whitespace-pre-wrap">
          {before ? JSON.stringify(beforeObj, null, 2) : '-'}
        </pre>
      </div>
      <div>
        <div className="text-emerald-400 font-medium mb-1">变更后</div>
        <pre className="bg-dark-lighter rounded p-2 text-white/60 overflow-auto max-h-40 whitespace-pre-wrap">
          {after ? JSON.stringify(afterObj, null, 2) : '-'}
        </pre>
      </div>
      {allKeys.length > 0 && (
        <div className="col-span-2">
          <div className="text-gold font-medium mb-1">差异字段</div>
          <div className="flex flex-wrap gap-2">
            {allKeys.map(key => {
              const bv = JSON.stringify(beforeObj[key])
              const av = JSON.stringify(afterObj[key])
              const changed = bv !== av
              return changed ? (
                <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gold/20 text-gold text-xs">
                  {key}
                </span>
              ) : null
            })}
            {allKeys.every(k => JSON.stringify(beforeObj[k]) === JSON.stringify(afterObj[k])) && (
              <span className="text-white/30">无差异</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditLog() {
  const { auditLogs, members } = useGymStore()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [operatorFilter, setOperatorFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const memberMap = useMemo(() => {
    const m: Record<string, string> = {}
    members.forEach(mb => { m[mb.id] = mb.name })
    return m
  }, [members])

  const filtered = useMemo(() => {
    let logs = [...auditLogs].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )
    if (dateFrom) {
      logs = logs.filter(l => l.createdAt.slice(0, 10) >= dateFrom)
    }
    if (dateTo) {
      logs = logs.filter(l => l.createdAt.slice(0, 10) <= dateTo)
    }
    if (operatorFilter) {
      logs = logs.filter(l =>
        l.operatorId === operatorFilter ||
        (memberMap[l.operatorId] ?? '').includes(operatorFilter)
      )
    }
    if (actionFilter) {
      logs = logs.filter(l => l.action === actionFilter)
    }
    return logs
  }, [auditLogs, dateFrom, dateTo, operatorFilter, actionFilter, memberMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">审计日志</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950 text-gold hover:bg-emerald-900 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          导出审计日志
        </button>
      </div>

      <div className="card-warm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className="text-xs text-dark/40 mb-1 block">开始日期</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
          <div>
            <label className="text-xs text-dark/40 mb-1 block">结束日期</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
          <div>
            <label className="text-xs text-dark/40 mb-1 block">操作人</label>
            <input
              type="text"
              placeholder="搜索操作人..."
              value={operatorFilter}
              onChange={e => { setOperatorFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
          <div>
            <label className="text-xs text-dark/40 mb-1 block">操作类型</label>
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg border border-warm-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            >
              <option value="">全部</option>
              {ACTION_TYPES.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card-dark overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium w-8"></th>
              <th className="text-left px-5 py-3 font-medium">时间</th>
              <th className="text-left px-5 py-3 font-medium">操作人</th>
              <th className="text-left px-5 py-3 font-medium">角色</th>
              <th className="text-left px-5 py-3 font-medium">操作类型</th>
              <th className="text-left px-5 py-3 font-medium">目标类型</th>
              <th className="text-left px-5 py-3 font-medium">目标ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-white/30">暂无审计日志</td>
              </tr>
            )}
            {paginated.map(log => {
              const isExpanded = expandedId === log.id
              const roleBadge = ROLE_BADGE[log.operatorRole]
              return (
                <tr key={log.id} className="hover:bg-dark-light/50 transition-colors">
                  <td className="px-5 py-3">
                    {(log.beforeData || log.afterData) && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="p-0.5 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-white/60 text-xs">
                    {log.createdAt.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="px-5 py-3 text-white/80">
                    {memberMap[log.operatorId] ?? log.operatorId}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', roleBadge.className)}>
                      {roleBadge.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gold/10 text-gold">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white/50">{log.targetType}</td>
                  <td className="px-5 py-3 text-white/40 text-xs font-mono">{log.targetId.slice(0, 8)}…</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {expandedId && (() => {
          const log = paginated.find(l => l.id === expandedId)
          if (!log) return null
          return (
            <div className="border-t border-white/10 px-5 py-4 bg-dark-light/20">
              <h4 className="text-xs font-semibold text-white/60 mb-3">操作详情</h4>
              <JsonDiff before={log.beforeData} after={log.afterData} />
            </div>
          )
        })()}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-dark/40">
          共 {filtered.length} 条记录，第 {page}/{totalPages} 页
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
              page <= 1 ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-dark text-white/60 hover:bg-dark-light hover:text-white'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            上一页
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
              page >= totalPages ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-dark text-white/60 hover:bg-dark-light hover:text-white'
            )}
          >
            下一页
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
