import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { User, Link } from 'lucide-react'

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolution, setResolution] = useState('')
  const navigate = useNavigate()

  const load = () => {
    const params: any = {}
    if (filter) params.status = filter
    if (assigneeFilter) params.assignee_id = assigneeFilter
    api.getTasks(params).then(setTasks)
  }

  useEffect(() => { api.getTeam().then(setTeam) }, [])
  useEffect(() => { load() }, [filter, assigneeFilter])

  const handleClaim = async (id: string) => {
    await api.updateTask(id, { status: 'claimed' })
    load()
  }

  const handleResolve = async (id: string) => {
    if (!resolution.trim()) return
    await api.updateTask(id, { status: 'resolved', resolution_text: resolution })
    setResolvingId(null)
    setResolution('')
    load()
  }

  const handleIgnore = async (id: string) => {
    await api.updateTask(id, { status: 'ignored' })
    load()
  }

  const statCounts = {
    all: tasks.length,
    open: tasks.filter(t => t.status === 'open').length,
    claimed: tasks.filter(t => t.status === 'claimed').length,
    resolved: tasks.filter(t => t.status === 'resolved').length,
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">任务</h2>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {[
            { value: '', label: `全部 (${statCounts.all})` },
            { value: 'open', label: `待处理 (${statCounts.open})` },
            { value: 'claimed', label: `进行中 (${statCounts.claimed})` },
            { value: 'resolved', label: `已解决 (${statCounts.resolved})` },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === f.value ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {team.length > 0 && (
          <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">全部处理人</option>
            {team.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-3">
        {tasks.map(t => (
          <div key={t.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                  <span className={`badge badge-${t.status}`}>{t.status}</span>
                  {t.assignee_name && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"><User size={12} />推荐处理人: {t.assignee_name}</span>
                  )}
                </div>
                <h4 className="text-sm font-medium text-gray-900">{t.title}</h4>
              </div>
              <div className="flex gap-2 shrink-0">
                {t.run_id && (
                  <button onClick={() => navigate(`/analysis/runs/${t.run_id}`)}
                    className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50"
                    title="查看关联洞察">
                    <Link size={12} /> 关联洞察
                  </button>
                )}
                {t.status === 'open' && (
                  <>
                    <button onClick={() => handleClaim(t.id)} className="px-3 py-1 text-xs bg-brand text-white rounded-lg hover:bg-brand-light">领取</button>
                    <button onClick={() => handleIgnore(t.id)} className="px-3 py-1 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">忽略</button>
                  </>
                )}
                {t.status === 'claimed' && (
                  <button onClick={() => setResolvingId(t.id)} className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600">解决</button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-2">{t.description}</p>

            {t.status === 'resolved' && t.resolution_text && (
              <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700 mt-2">
                <strong>解决方案:</strong> {t.resolution_text}
              </div>
            )}

            {resolvingId === t.id && (
              <div className="mt-3 space-y-2">
                <textarea value={resolution} onChange={e => setResolution(e.target.value)}
                  placeholder="描述解决方案..." rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setResolvingId(null)} className="px-3 py-1.5 text-sm text-gray-500">取消</button>
                  <button onClick={() => handleResolve(t.id)} className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg">确认解决</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {tasks.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">暂无任务</div>}
      </div>
    </div>
  )
}
