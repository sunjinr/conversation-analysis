import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Plus, Eye, Loader2, Trash2 } from 'lucide-react'

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Convert UTC datetime to local time
  const formatLocalTime = (utcStr: string | null | undefined) => {
    if (!utcStr) return '-'
    const localDate = new Date(utcStr.replace(' ', 'T') + 'Z')
    return localDate.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  const loadRuns = () => {
    api.getRuns().then(data => {
      setRuns(data)
      setLoading(false)
    })
  }

  useEffect(() => { loadRuns() }, [])

  const deleteRun = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (!confirm(`确认删除洞察"${name}"？该操作不可撤销。`)) return
    try {
      await api.deleteRun(id)
      loadRuns()
    } catch (err: any) {
      alert(err.message || '删除失败')
    }
  }

  // Poll for running tasks
  useEffect(() => {
    const hasRunning = runs.some(r => r.status === 'running' || r.status === 'pending')
    if (!hasRunning) return

    const interval = setInterval(() => {
      api.getRuns().then(data => {
        setRuns(data)
        const stillRunning = data.some(r => r.status === 'running' || r.status === 'pending')
        if (!stillRunning) clearInterval(interval)
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [runs])

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-600 border-amber-200',
      running: 'bg-blue-50 text-blue-600 border-blue-200',
      completed: 'bg-green-50 text-green-600 border-green-200',
      failed: 'bg-red-50 text-red-600 border-red-200',
    }
    const labels: Record<string, string> = {
      pending: '准备中',
      running: '分析中',
      completed: '已完成',
      failed: '失败',
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[status] || styles.pending}`}>
        {status === 'running' && <Loader2 size={10} className="inline animate-spin mr-1" />}
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">洞察</h2>
        <button onClick={() => navigate('/analysis/runs/new')}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light">
          <Plus size={16} /> 新建洞察
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          加载中...
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map(r => (
            <div
              key={r.id}
              onClick={() => navigate(`/analysis/runs/${r.id}`)}
              className={`bg-white rounded-xl p-5 shadow-sm border transition-all cursor-pointer ${
                r.status === 'running' || r.status === 'pending'
                  ? 'border-blue-200 hover:border-blue-300'
                  : 'border-gray-100 hover:border-accent/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(r.status)}
                    <span className="text-sm font-semibold text-gray-900">{r.name || '洞察任务'}</span>
                    {r.user_question && (
                      <span className="text-xs text-gray-400 ml-1 truncate max-w-md">{r.user_question}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    数据池: {r.total_sessions || 0}条 | 相关分析: {r.processed_sessions || 0}条 | {formatLocalTime(r.started_at || r.created_at)}
                  </p>
                  {/* Progress bar for running tasks */}
                  {(r.status === 'running' || r.status === 'pending') && r.total_sessions > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(((r.processed_sessions || 0) / r.total_sessions) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        进度: {r.processed_sessions || 0}/{r.total_sessions} ({Math.round(((r.processed_sessions || 0) / r.total_sessions) * 100)}%)
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button onClick={e => deleteRun(e, r.id, r.name || '洞察任务')}
                    className="text-gray-300 hover:text-red-500 transition-colors" title="删除">
                    <Trash2 size={14} />
                  </button>
                  <Eye size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          ))}
          {runs.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm mb-4">暂无洞察任务</p>
              <button
                onClick={() => navigate('/analysis/runs/new')}
                className="text-sm text-accent hover:underline"
              >
                发起第一个洞察 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
