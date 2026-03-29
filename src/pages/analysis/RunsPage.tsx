import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Plus, Play, Eye } from 'lucide-react'

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => { api.getRuns().then(setRuns) }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">分析任务</h2>
        <button onClick={() => navigate('/analysis/runs/new')}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-dark">
          <Plus size={16} /> 新建分析
        </button>
      </div>

      <div className="space-y-3">
        {runs.map(r => (
          <div key={r.id} onClick={() => navigate(`/analysis/runs/${r.id}`)}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-brand/30 cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge badge-${r.status}`}>{r.status}</span>
                  <span className="text-sm font-medium text-gray-900">{r.created_at?.slice(0, 16)}</span>
                </div>
                <p className="text-sm text-gray-500">
                  会话: {r.total_sessions}条 | 已处理: {r.processed_sessions}条
                </p>
              </div>
              <Eye size={16} className="text-gray-400" />
            </div>
          </div>
        ))}
        {runs.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">暂无分析任务</div>
        )}
      </div>
    </div>
  )
}
