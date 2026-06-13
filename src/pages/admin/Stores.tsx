import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import { save, generateId } from '@/lib/storage'
import type { Store } from '@/types'

export default function Stores() {
  const { stores } = useGymStore()
  const [storeList, setStoreList] = useState<Store[]>(stores)
  const [showModal, setShowModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formCrossStore, setFormCrossStore] = useState(false)

  const persist = (data: Store[]) => {
    setStoreList(data)
    useGymStore.setState({ stores: data })
    save('stores', data)
  }

  const handleAdd = () => {
    if (!formName.trim() || !formAddress.trim()) return
    const newStore: Store = {
      id: generateId(),
      name: formName.trim(),
      address: formAddress.trim(),
      crossStoreBooking: formCrossStore,
    }
    persist([...storeList, newStore])
    setFormName('')
    setFormAddress('')
    setFormCrossStore(false)
    setShowModal(false)
  }

  const toggleCrossStore = (id: string) => {
    const updated = storeList.map(s =>
      s.id === id ? { ...s, crossStoreBooking: !s.crossStoreBooking } : s
    )
    persist(updated)
  }

  const handleDelete = (id: string) => {
    persist(storeList.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">跨门店配置</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950 text-gold hover:bg-emerald-900 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增门店
        </button>
      </div>

      <div className="card-dark overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium">门店名称</th>
              <th className="text-left px-5 py-3 font-medium">地址</th>
              <th className="text-left px-5 py-3 font-medium">跨门店预约</th>
              <th className="text-left px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {storeList.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-white/30">暂无门店数据</td>
              </tr>
            )}
            {storeList.map(store => (
              <tr key={store.id} className="text-white/80 hover:bg-dark-light/50 transition-colors">
                <td className="px-5 py-3 font-medium">{store.name}</td>
                <td className="px-5 py-3 text-white/50">{store.address}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => toggleCrossStore(store.id)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      store.crossStoreBooking ? 'bg-emerald-700' : 'bg-dark-lighter'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        store.crossStoreBooking ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                  <span className="ml-2 text-xs text-white/40">
                    {store.crossStoreBooking ? '已开启' : '已关闭'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => handleDelete(store.id)}
                    className="p-1.5 rounded-lg bg-coral/10 text-coral hover:bg-coral/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">新增门店</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">门店名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="如: 国贸旗舰店"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">地址</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  placeholder="如: 国贸中心B1层"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/50">跨门店预约</label>
                <button
                  type="button"
                  onClick={() => setFormCrossStore(!formCrossStore)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    formCrossStore ? 'bg-emerald-700' : 'bg-dark-lighter'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      formCrossStore ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
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
                  disabled={!formName.trim() || !formAddress.trim()}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                    formName.trim() && formAddress.trim()
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
