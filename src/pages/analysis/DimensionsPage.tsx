import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, Layers, Trash2, Edit3, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { DimensionCategory } from '@/lib/types'

export default function DimensionsPage() {
  const [dimensions, setDimensions] = useState<any[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', definition: '', categories: [] as DimensionCategory[], auto_discover: true, sub_skill_ref: '' })
  const [newCat, setNewCat] = useState({ name: '', description: '' })

  const load = () => api.getDimensions().then(setDimensions)
  useEffect(() => { load() }, [])

  const addCategory = () => {
    if (!newCat.name) return
    setForm(f => ({ ...f, categories: [...f.categories, { ...newCat }] }))
    setNewCat({ name: '', description: '' })
  }

  const removeCategory = (i: number) => setForm(f => ({ ...f, categories: f.categories.filter((_, j) => j !== i) }))

  const handleSave = async () => {
    if (!form.name || !form.definition) return
    if (editing) {
      await api.updateDimension(editing, form)
    } else {
      await api.createDimension(form)
    }
    setForm({ name: '', definition: '', categories: [], auto_discover: true, sub_skill_ref: '' })
    setShowForm(false)
    setEditing(null)
    load()
  }

  const startEdit = (d: any) => {
    setForm({
      name: d.name,
      definition: d.definition,
      categories: JSON.parse(d.categories_json || '[]'),
      auto_discover: !!d.auto_discover,
      sub_skill_ref: d.sub_skill_ref || '',
    })
    setEditing(d.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此维度？')) return
    await api.deleteDimension(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">洞察维度</h2>
          <p className="text-sm text-gray-500 mt-1">配置洞察目标和分类体系</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', definition: '', categories: [], auto_discover: true, sub_skill_ref: '' }) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light">
          <Plus size={16} /> 添加维度
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">{editing ? '编辑维度' : '新建维度'}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null) }}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="space-y-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="维度名称（如：不满意原因洞察）" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
            <textarea value={form.definition} onChange={e => setForm(f => ({ ...f, definition: e.target.value }))}
              placeholder="维度定义（详细描述洞察目标和分类规则）" rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />

            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">分类类别</h4>
              <div className="space-y-2 mb-3">
                {form.categories.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700">{c.name}</span>
                      {c.description && <span className="text-xs text-gray-400 ml-2">{c.description}</span>}
                    </div>
                    <button onClick={() => removeCategory(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newCat.name} onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))}
                  placeholder="类别名称" className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm" />
                <input value={newCat.description} onChange={e => setNewCat(c => ({ ...c, description: e.target.value }))}
                  placeholder="描述（可选）" className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm" />
                <button onClick={addCategory} className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200">添加</button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.auto_discover} onChange={e => setForm(f => ({ ...f, auto_discover: e.target.checked }))}
                className="rounded border-gray-300" />
              AI+挖掘新维度（AI发现不属于现有类别的数据时，自动新增类别）
            </label>

            <input value={form.sub_skill_ref} onChange={e => setForm(f => ({ ...f, sub_skill_ref: e.target.value }))}
              placeholder="子Skill引用（可选，如：competitor_compare）" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); setEditing(null) }} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">取消</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-light">
                {editing ? '保存修改' : '创建维度'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {dimensions.map(d => {
          const cats = JSON.parse(d.categories_json || '[]') as DimensionCategory[]
          return (
            <div key={d.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={16} className="text-accent" />
                  <h4 className="font-semibold text-gray-900">{d.name}</h4>
                  {d.auto_discover ? <span className="badge bg-amber-100 text-amber-600">AI+挖掘</span> : null}
                  {d.sub_skill_ref && <span className="badge bg-blue-100 text-blue-600">Skill: {d.sub_skill_ref}</span>}
                  {!d.enabled && <span className="badge bg-gray-100 text-gray-400">已禁用</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(d)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Edit3 size={14} /></button>
                  <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{d.definition}</p>
              <div className="flex flex-wrap gap-2">
                {cats.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-gray-600" title={c.description}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
