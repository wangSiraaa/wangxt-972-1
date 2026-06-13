import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import { save, generateId } from '@/lib/storage'
import type { Venue } from '@/types'

export default function Venues() {
  const { venues, stores, bookings, courses } = useGymStore()
  const [venueList, setVenueList] = useState<Venue[]>(venues)
  const [showModal, setShowModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formStoreId, setFormStoreId] = useState('')
  const [formCapacity, setFormCapacity] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCapacity, setEditCapacity] = useState(0)

  const todayStr = new Date().toISOString().slice(0, 10)

  const getOccupancy = useMemo(() => {
    const map: Record<string, number> = {}
    bookings.forEach(b => {
      if (b.datetime.startsWith(todayStr) && b.status !== 'cancelled') {
        const course = courses.find(c => c.id === b.courseId)
        if (course) {
          const venue = venues.find(v => v.id === course.venueId)
          if (venue) {
            map[venue.id] = (map[venue.id] || 0) + 1
          }
        }
      }
    })
    return map
  }, [bookings, courses, venues, todayStr])

  const persist = (data: Venue[]) => {
    setVenueList(data)
    useGymStore.setState({ venues: data })
    save('venues', data)
  }

  const handleAdd = () => {
    if (!formName.trim() || !formStoreId || formCapacity < 1) return
    const newVenue: Venue = {
      id: generateId(),
      name: formName.trim(),
      storeId: formStoreId,
      capacity: formCapacity,
    }
    persist([...venueList, newVenue])
    setFormName('')
    setFormStoreId('')
    setFormCapacity(1)
    setShowModal(false)
  }

  const startEdit = (venue: Venue) => {
    setEditingId(venue.id)
    setEditCapacity(venue.capacity)
  }

  const saveEdit = (id: string) => {
    if (editCapacity < 1) return
    const updated = venueList.map(v =>
      v.id === id ? { ...v, capacity: editCapacity } : v
    )
    persist(updated)
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    persist(venueList.filter(v => v.id !== id))
  }

  const getStoreName = (storeId: string) =>
    stores.find(s => s.id === storeId)?.name ?? storeId

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">场地容量管理</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950 text-gold hover:bg-emerald-900 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增场地
        </button>
      </div>

      <div className="card-dark overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium">场地名称</th>
              <th className="text-left px-5 py-3 font-medium">所属门店</th>
              <th className="text-left px-5 py-3 font-medium">容量</th>
              <th className="text-left px-5 py-3 font-medium">今日占用</th>
              <th className="text-left px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {venueList.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-white/30">暂无场地数据</td>
              </tr>
            )}
            {venueList.map(venue => {
              const occupancy = getOccupancy[venue.id] || 0
              const ratio = occupancy / venue.capacity
              return (
                <tr key={venue.id} className="text-white/80 hover:bg-dark-light/50 transition-colors">
                  <td className="px-5 py-3 font-medium">{venue.name}</td>
                  <td className="px-5 py-3 text-white/50">{getStoreName(venue.storeId)}</td>
                  {editingId === venue.id ? (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={editCapacity}
                          onChange={e => setEditCapacity(Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded border border-white/10 bg-dark-lighter text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/40"
                        />
                        <button
                          onClick={() => saveEdit(venue.id)}
                          className="p-1 rounded-lg bg-emerald-700/20 text-emerald-400 hover:bg-emerald-700/40 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded-lg bg-white/10 text-white/50 hover:bg-white/20 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  ) : (
                    <td className="px-5 py-3">
                      <span className="text-white font-medium">{venue.capacity}</span>
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-white/30" />
                      <span className={cn(
                        'font-medium',
                        ratio >= 1 ? 'text-coral' : ratio >= 0.8 ? 'text-gold' : 'text-emerald-400'
                      )}>
                        {occupancy}
                      </span>
                      <span className="text-white/30">/ {venue.capacity}</span>
                      <div className="w-16 h-1.5 bg-dark-lighter rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            ratio >= 1 ? 'bg-coral' : ratio >= 0.8 ? 'bg-gold' : 'bg-emerald-700'
                          )}
                          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(venue)}
                        className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(venue.id)}
                        className="p-1.5 rounded-lg bg-coral/10 text-coral hover:bg-coral/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">新增场地</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">场地名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="如: A训练区"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">所属门店</label>
                <select
                  value={formStoreId}
                  onChange={e => setFormStoreId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                >
                  <option value="">-- 请选择门店 --</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">容量</label>
                <input
                  type="number"
                  min={1}
                  value={formCapacity}
                  onChange={e => setFormCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!formName.trim() || !formStoreId || formCapacity < 1}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                    formName.trim() && formStoreId && formCapacity >= 1
                      ? 'bg-gold text-emerald-950 hover:bg-gold-light'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  )}
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
