import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Play } from 'lucide-react'

export default function NewRunPage() {
  const [scenarios, setScenarios] = useState<any[]>([])
  const [dimensions, setDimensions] = useState<any[]>([])
  const [selectedScenario, setSelectedScenario] = useState('')
  const [selectedDims, setSelectedDims] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.getScenarios().then(setScenarios)
    api.getDimensions().then(dims => {
      setDimensions(dims)
      setSelectedDims(new Set(dims.filter((d: any) => d.enabled).map((d: any) => d.id)))
    })
  }, [])

  const toggleDim = (id: string) => {
    setSelectedDims(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await api.createRun({
        name: name || `分析 ${new Date().toLocaleDateString('zh-CN')}`,
        scenario_id: selectedScenario || null,
        dimension_ids: Array.from(selectedDims),
      })
      navigate(`/analysis/runs/${res.id}`)
    } catch (e: any) { alert(e.message) }
    finally { setCreating(false) }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-6">创建分析任务</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">任务名称</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder={`分析 ${new Date().toLocaleDateString('zh-CN')}`}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">选择场景（可选，不选则分析全部会话）</label>
          <select value={selectedScenario} onChange={e => setSelectedScenario(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value="">全部会话</option>
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.matched_count}条匹配)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">选择分析维度</label>
          <div className="space-y-2">
            {dimensions.map(d => (
              <label key={d.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedDims.has(d.id) ? 'border-brand bg-brand/5' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input type="checkbox" checked={selectedDims.has(d.id)} onChange={() => toggleDim(d.id)}
                  className="rounded border-gray-300 text-brand" />
                <div>
                  <span className="text-sm font-medium text-gray-900">{d.name}</span>
                  <p className="text-xs text-gray-500">{d.definition.slice(0, 80)}...</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleCreate} disabled={creating || selectedDims.size === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
          <Play size={16} />
          {creating ? '创建中...' : '发起分析'}
        </button>
      </div>
    </div>
  )
}
