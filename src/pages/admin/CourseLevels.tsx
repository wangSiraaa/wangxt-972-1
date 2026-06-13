import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGymStore } from '@/stores/gymStore'
import { save, generateId } from '@/lib/storage'
import type { CourseLevel } from '@/types'

export default function CourseLevels() {
  const { courseLevels } = useGymStore()
  const [levels, setLevels] = useState<CourseLevel[]>(courseLevels)
  const [showModal, setShowModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formColor, setFormColor] = useState('#4ADE80')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editColor, setEditColor] = useState('')

  const persist = (data: CourseLevel[]) => {
    setLevels(data)
    useGymStore.setState({ courseLevels: data })
    save('course_levels', data)
  }

  const handleAdd = () => {
    if (!formName.trim() || !formCode.trim()) return
    const newLevel: CourseLevel = {
      id: generateId(),
      name: formName.trim(),
      code: formCode.trim(),
      color: formColor,
    }
    persist([...levels, newLevel])
    setFormName('')
    setFormCode('')
    setFormColor('#4ADE80')
    setShowModal(false)
  }

  const startEdit = (lv: CourseLevel) => {
    setEditingId(lv.id)
    setEditName(lv.name)
    setEditCode(lv.code)
    setEditColor(lv.color)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = (id: string) => {
    if (!editName.trim() || !editCode.trim()) return
    const updated = levels.map(lv =>
      lv.id === id ? { ...lv, name: editName.trim(), code: editCode.trim(), color: editColor } : lv
    )
    persist(updated)
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    persist(levels.filter(lv => lv.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading-display text-2xl font-bold text-dark">课程等级管理</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950 text-gold hover:bg-emerald-900 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增等级
        </button>
      </div>

      <div className="card-dark overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left px-5 py-3 font-medium">等级名称</th>
              <th className="text-left px-5 py-3 font-medium">编码</th>
              <th className="text-left px-5 py-3 font-medium">颜色</th>
              <th className="text-left px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {levels.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-white/30">暂无等级数据</td>
              </tr>
            )}
            {levels.map(lv => (
              <tr key={lv.id} className="text-white/80 hover:bg-dark-light/50 transition-colors">
                {editingId === lv.id ? (
                  <>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-white/10 bg-dark-lighter text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/40"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={editCode}
                        onChange={e => setEditCode(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-white/10 bg-dark-lighter text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/40"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={e => setEditColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-white/10 bg-transparent"
                        />
                        <span className="text-white/50 text-xs">{editColor}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => saveEdit(lv.id)}
                          className="p-1.5 rounded-lg bg-emerald-700/20 text-emerald-400 hover:bg-emerald-700/40 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-white/10 text-white/50 hover:bg-white/20 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-5 py-3 font-medium">{lv.name}</td>
                    <td className="px-5 py-3 text-white/50">{lv.code}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full border border-white/10"
                          style={{ backgroundColor: lv.color }}
                        />
                        <span className="text-white/50 text-xs">{lv.color}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(lv)}
                          className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lv.id)}
                          className="p-1.5 rounded-lg bg-coral/10 text-coral hover:bg-coral/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card-dark p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">新增等级</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">等级名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="如: 基础"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">编码</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  placeholder="如: BASIC"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">颜色</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
                  />
                  <input
                    type="text"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-dark-light text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                  />
                </div>
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
                  disabled={!formName.trim() || !formCode.trim()}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                    formName.trim() && formCode.trim()
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
