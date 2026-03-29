import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, Target, Search, Trash2, Eye } from 'lucide-react'

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', date_from: '', date_to: '' })
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [previewResults, setPreviewResults] = useState<any[]>([])

  useEffect(() => { api.getScenarios().then(setScenarios) }, [])

  const handleCreate = async () => {
    if (!form.name || !form.description) return
    await api.createScenario(form)
    setForm({ name: '', description: '', date_from: '', date_to: '' })
    setShowForm(false)
    api.getScenarios().then(setScenarios)
  }

  const handlePreview = async (id: string) => {
    setPreviewing(id)
    try {
      const res = await api.previewScenario(id)
      setPreviewResults(res.results)
      api.getScenarios().then(setScenarios)
    } catch (e: any) { alert(e.message) }
    finally { setPreviewing(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此场景？')) return
    await api.deleteScenario(id)
    api.getScenarios().then(setScenarios)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">圈场景</h2>
          <p className="text-sm text-gray-500 mt-1">用自然语言描述场景，语义检索匹配会话</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light">
          <Plus size={16} /> 新建场景
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">创建场景</h3>
          <div className="space-y-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="场景名称" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="用自然语言描述你想分析的场景，如：AI客服回答错误导致买家不满意的会话" rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">开始日期</label>
                <input type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">结束日期</label>
                <input type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-light">创建</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {scenarios.map(s => (
          <div key={s.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-accent" />
                <h4 className="font-semibold text-gray-900">{s.name}</h4>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handlePreview(s.id)} disabled={previewing === s.id}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-accent">
                  {previewing === s.id ? <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" /> : <Search size={14} />}
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{s.description}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {s.date_from && <span>从 {s.date_from}</span>}
              {s.date_to && <span>到 {s.date_to}</span>}
              <span className="bg-accent-light text-accent px-2 py-0.5 rounded-full font-medium">匹配 {s.matched_count} 条</span>
            </div>
          </div>
        ))}
      </div>

      {previewResults.length > 0 && (
        <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">匹配预览 (前20条)</h3>
          <div className="space-y-2">
            {previewResults.map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-400 mt-0.5 w-8">{(r.similarity * 100).toFixed(0)}%</span>
                <p className="text-sm text-gray-600 flex-1">{r.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
