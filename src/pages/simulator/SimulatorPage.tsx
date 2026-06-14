import { useState } from 'react'
import { Play, CheckCircle2, XCircle, ArrowRight, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import type { SimulationResult } from '@/types'

export default function SimulatorPage() {
  const { members, courses, simulateDeductionForBooking } = useGymStore()
  const [memberId, setMemberId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [revealed, setRevealed] = useState(false)

  const memberList = members.filter(m => m.role === 'member')

  const handleSimulate = () => {
    if (!memberId || !courseId) return
    const course = courses.find(c => c.id === courseId)
    const sim = simulateDeductionForBooking(memberId, courseId, course?.storeId)
    setRevealed(false)
    setResult(sim)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealed(true))
    })
  }

  const reset = () => {
    setResult(null)
    setRevealed(false)
    setMemberId('')
    setCourseId('')
  }

  return (
    <div className="space-y-6">
      <h1 className="heading-display text-2xl font-bold text-dark">扣减模拟器</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 card-dark p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">模拟参数</h2>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">选择会员</label>
            <select
              value={memberId}
              onChange={e => setMemberId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            >
              <option value="">-- 请选择会员 --</option>
              {memberList.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">选择课程</label>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            >
              <option value="">-- 请选择课程 --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSimulate}
              disabled={!memberId || !courseId}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors',
                memberId && courseId
                  ? 'bg-gold text-emerald-950 hover:bg-gold-light'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              <Play className="w-4 h-4" />
              模拟扣减
            </button>
            <button
              onClick={reset}
              className="px-4 py-2.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          {!result ? (
            <div className="card-dark p-10 flex flex-col items-center justify-center text-white/30 min-h-[300px]">
              <Play className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">选择会员和课程后点击「模拟扣减」查看结果</p>
            </div>
          ) : (
            <div
              className={cn(
                'space-y-5 transition-all duration-700 ease-out',
                revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <div className={cn(
                'card-dark p-5 flex items-center gap-4',
                result.canDeduct ? 'border-emerald-700/30' : 'border-coral/30'
              )}>
                {result.canDeduct ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-coral shrink-0" />
                )}
                <div>
                  <div className={cn('text-lg font-semibold', result.canDeduct ? 'text-emerald-400' : 'text-coral')}>
                    {result.canDeduct ? '可以扣减' : '无法扣减'}
                  </div>
                  {!result.canDeduct && result.reason && (
                    <div className="text-sm text-white/50 mt-0.5">{result.reason}</div>
                  )}
                  {result.canDeduct && (
                    <div className="text-sm text-white/50 mt-0.5">
                      共需扣减 <span className="text-gold font-medium">{result.totalDeduction}</span> 次，匹配 {result.matchedPackages.length} 个课包
                    </div>
                  )}
                </div>
              </div>

              <div className="card-dark p-5">
                <h3 className="text-sm font-semibold text-white/70 mb-4">课包匹配顺序</h3>
                <div className="flex flex-col gap-0">
                  {result.matchedPackages.map((pkg, i) => (
                    <div key={pkg.packageId} className="flex items-stretch">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                          i === 0 ? 'bg-gold text-emerald-950' : 'bg-dark-lighter text-white/60'
                        )}>
                          {i + 1}
                        </div>
                        {i < result.matchedPackages.length - 1 && (
                          <div className="w-px flex-1 bg-white/10 my-1" />
                        )}
                      </div>
                      <div className="ml-4 pb-5 flex-1 min-w-0">
                        <div className="bg-dark-light rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white font-medium text-sm">{pkg.packageTypeName}</span>
                            {pkg.isGift && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-gold/20 text-gold">
                                <Gift className="w-3 h-3" />
                                赠课
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            <span className="text-white/40">到期: {pkg.expireDate}</span>
                            <span className="text-white/60">余额: <span className="text-white font-medium">{pkg.currentBalance}</span></span>
                            <ArrowRight className="w-4 h-4 text-gold" />
                            <span className="text-gold font-medium">-{pkg.deductionAmount}</span>
                            <ArrowRight className="w-4 h-4 text-white/20" />
                            <span className="text-emerald-400 font-medium">{pkg.afterBalance}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-dark p-5">
                <h3 className="text-sm font-semibold text-white/70 mb-4">扣减前后对比</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/40 text-xs border-b border-white/10">
                        <th className="text-left pb-3 font-medium">课包</th>
                        <th className="text-right pb-3 font-medium">扣减前</th>
                        <th className="text-right pb-3 font-medium">扣减量</th>
                        <th className="text-right pb-3 font-medium">扣减后</th>
                        <th className="text-right pb-3 font-medium">差异</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {result.matchedPackages.map(pkg => (
                        <tr key={pkg.packageId} className="text-white/80">
                          <td className="py-3 font-medium text-white/90">{pkg.packageTypeName}</td>
                          <td className="py-3 text-right">{pkg.currentBalance}</td>
                          <td className="py-3 text-right text-gold font-medium">-{pkg.deductionAmount}</td>
                          <td className="py-3 text-right">{pkg.afterBalance}</td>
                          <td className="py-3 text-right">
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              pkg.deductionAmount > 0 ? 'bg-gold/20 text-gold' : 'bg-white/5 text-white/30'
                            )}>
                              {pkg.deductionAmount > 0 ? `-${pkg.deductionAmount}` : '0'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
