import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Plus, Target, Trash2, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: '等待匹配', color: 'text-gray-400 bg-gray-50',    icon: Loader2 },
  matching:  { label: '匹配中',   color: 'text-amber-600 bg-amber-50',  icon: Loader2 },
  completed: { label: '匹配完成', color: 'text-green-600 bg-green-50',  icon: CheckCircle },
  failed:    { label: '匹配失败', color: 'text-red-500 bg-red-50',      icon: AlertCircle },
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', date_from: '', date_to: '' })
  const [creating, setCreating] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigate = useNavigate()

  const loadScenarios = () => api.getScenarios().then(setScenarios)

  useEffect(() => {
    loadScenarios()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Poll for matching status updates when any scenario is pending/matching
  useEffect(() => {
    const hasActive = scenarios.some(s => s.match_status === 'pending' || s.match_status === 'matching')
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(loadScenarios, 3000)
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [scenarios])

  const handleCreate = async () => {
    if (!form.name || !form.description) return
    setCreating(true)
    try {
      await api.createScenario(form)
      setForm({ name: '', description: '', date_from: '', date_to: '' })
      setShowForm(false)
      loadScenarios()
    } catch (e: any) { alert(e.message) }
    finally { setCreating(false) }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('确定删除此场景？')) return
    await api.deleteScenario(id)
    loadScenarios()
  }

  const handleRematch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await api.rematchScenario(id)
    loadScenarios()
  }

  const getStatusInfo = (status: string) => STATUS_MAP[status] || STATUS_MAP.pending

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">自由圈场景</h2>
          <p className="text-sm text-gray-500 mt-1">用自然语言描述场景，自动语义匹配会话数据</p>
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
              placeholder="用自然语言描述你想洞察的场景，如：AI客服回答错误导致买家不满意的会话" rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">开始日期（可选）</label>
                <input type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">结束日期（可选）</label>
                <input type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">取消</button>
              <button onClick={handleCreate} disabled={creating}
                className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50">
                {creating ? '创建中...' : '创建并匹配'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {scenarios.map(s => {
          const status = getStatusInfo(s.match_status)
          const StatusIcon = status.icon
          const isClickable = s.match_status === 'completed' && s.matched_count > 0

          return (
            <div key={s.id}
              onClick={() => isClickable && navigate(`/analysis/scenarios/${s.id}`)}
              className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 transition-all ${
                isClickable ? 'cursor-pointer hover:shadow-md hover:border-accent/30' : ''
              }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Target size={16} className="text-accent shrink-0" />
                  <h4 className="font-semibold text-gray-900 truncate">{s.name}</h4>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  {s.match_status === 'failed' && (
                    <button onClick={(e) => handleRematch(e, s.id)} title="重新匹配"
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-accent">
                      <RefreshCw size={14} />
                    </button>
                  )}
                  <button onClick={(e) => handleDelete(e, s.id)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{s.description}</p>

              <div className="flex items-center gap-3 text-xs">
                {s.date_from && <span className="text-gray-400">从 {s.date_from}</span>}
                {s.date_to && <span className="text-gray-400">到 {s.date_to}</span>}

                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                  <StatusIcon size={12} className={s.match_status === 'matching' || s.match_status === 'pending' ? 'animate-spin' : ''} />
                  {status.label}
                </span>

                {s.match_status === 'completed' && (
                  <span className="bg-accent-light text-accent px-2 py-0.5 rounded-full font-medium">
                    匹配 {s.matched_count} 条
                  </span>
                )}
              </div>

              {s.match_status === 'failed' && s.error_message && (
                <p className="text-xs text-red-400 mt-2 truncate" title={s.error_message}>
                  错误: {s.error_message}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {scenarios.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Target size={48} className="mx-auto mb-3 opacity-30" />
          <p>暂无场景，点击"新建场景"开始</p>
        </div>
      )}
    </div>
  )
}
