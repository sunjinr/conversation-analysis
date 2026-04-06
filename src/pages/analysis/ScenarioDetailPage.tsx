import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { ArrowLeft, Download, Target, FileText } from 'lucide-react'

const FIELD_LABELS: Record<string, string> = {
  sequence_num: '序号',
  session_id: '会话ID',
  user_id: '用户ID',
  ocs_session_id: 'OCS会话ID',
  bot_conversation: 'AI客服对话',
  human_conversation: '人工客服对话',
  dissatisfaction_info: '不满意信息',
  session_date: '会话日期',
  imported_at: '导入时间',
  summary_text: '会话摘要',
  key_topics: '关键词',
}

const LONG_FIELDS = new Set(['bot_conversation', 'human_conversation', 'dissatisfaction_info', 'summary_text'])

export default function ScenarioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [scenario, setScenario] = useState<any>(null)
  const [matchData, setMatchData] = useState<{ total: number; sample: any; sessions: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getScenario(id),
      api.getMatchedSessions(id, 50),
    ]).then(([s, m]) => {
      setScenario(s)
      setMatchData(m)
    }).finally(() => setLoading(false))
  }, [id])

  const handleExport = () => {
    if (!id) return
    // Direct download via CSV endpoint
    const token = localStorage.getItem('auth_token') || ''
    const url = api.exportScenario(id)
    const a = document.createElement('a')
    a.href = url + (url.includes('?') ? '&' : '?') + `token=${token}`
    a.download = `scenario-${scenario?.name || id}.csv`
    a.click()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>
  }

  if (!scenario) {
    return <div className="text-center py-20 text-gray-400">场景不存在</div>
  }

  const sample = matchData?.sample
  const sampleFields = sample ? Object.keys(FIELD_LABELS).filter(k => sample[k] != null && sample[k] !== '') : []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/analysis/scenarios')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-accent" />
            <h2 className="text-xl font-bold text-gray-900">{scenario.name}</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-accent-light text-accent px-3 py-1 rounded-full text-sm font-medium">
            匹配 {scenario.matched_count} 条
          </span>
          {scenario.matched_count > 0 && (
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light">
              <Download size={14} /> 下载数据 (CSV)
            </button>
          )}
        </div>
      </div>

      {/* Sample session */}
      {sample ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText size={14} />
            数据样例（第一条匹配记录）
          </h3>
          <div className="space-y-3">
            {sampleFields.map(field => (
              <div key={field} className="flex gap-3">
                <span className="text-xs text-gray-500 w-24 shrink-0 pt-1 text-right">{FIELD_LABELS[field]}</span>
                {LONG_FIELDS.has(field) ? (
                  <pre className="flex-1 text-sm text-gray-800 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap break-words max-h-60 overflow-y-auto font-mono text-xs leading-relaxed">
                    {sample[field]}
                  </pre>
                ) : (
                  <span className="flex-1 text-sm text-gray-800">{sample[field]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6 text-center text-gray-400">
          暂无匹配的会话数据
        </div>
      )}
    </div>
  )
}
