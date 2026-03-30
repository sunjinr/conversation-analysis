import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Database, Plus, Clock, MessageSquare, X } from 'lucide-react'

const FIELD_LABELS: Record<string, string> = {
  sequence_num: '序号',
  session_id: 'Session ID',
  user_id: 'User ID',
  ocs_session_id: 'OCS Session ID',
  bot_conversation: '会员与机器人对话',
  human_conversation: '会员与客服对话',
  dissatisfaction_info: '会员点击不满意',
  session_date: '会话日期',
  imported_at: '导入时间',
  summary_text: 'AI 摘要',
  key_topics: '关键主题',
}

export default function SessionsPage() {
  const [sample, setSample] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [columns, setColumns] = useState<string[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadSample = () => {
    api.getSessionSample().then(res => {
      setSample(res.sample)
      setTotal(res.total)
      setColumns(res.columns)
    })
  }

  const loadRequests = () => {
    api.getDataRequests().then(setRequests)
  }

  useEffect(() => {
    loadSample()
    loadRequests()
  }, [])

  const handleSubmitRequest = async () => {
    if (!newDesc.trim()) return
    setSubmitting(true)
    try {
      await api.createDataRequest(newDesc)
      setNewDesc('')
      setShowForm(false)
      loadRequests()
    } catch (err: any) {
      alert('提交失败: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isLongText = (val: string) => val && val.length > 100

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">平台洞察数据源</h2>
          <p className="text-sm text-gray-500 mt-1">
            当前数据源共 <span className="font-medium text-gray-700">{total}</span> 条会话记录，以下展示一条完整的数据样例
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light transition-colors"
        >
          <Plus size={16} />
          提交数据源加工需求
        </button>
      </div>

      {/* Sample Record */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Database size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">数据样例</h3>
          <span className="text-xs text-gray-400 ml-2">展示第 1 条会话的完整字段</span>
        </div>
        {sample ? (
          <div className="divide-y divide-gray-50">
            {columns.map(col => {
              const val = sample[col]
              const displayVal = val === null || val === undefined || val === '' ? '-' : String(val)
              const long = isLongText(displayVal)
              return (
                <div key={col} className={`px-5 py-3 ${long ? 'flex flex-col gap-1.5' : 'flex items-start gap-4'}`}>
                  <div className={`text-xs font-medium text-gray-400 uppercase tracking-wide ${long ? '' : 'w-40 shrink-0 pt-0.5'}`}>
                    {FIELD_LABELS[col] || col}
                  </div>
                  <div className={`text-sm text-gray-800 ${long ? 'bg-gray-50 rounded-lg p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto' : 'flex-1 break-all'}`}>
                    {displayVal}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-gray-400 text-sm">暂无数据</div>
        )}
      </div>

      {/* Request History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">需求历史</h3>
          <span className="text-xs text-gray-400 ml-2">已提交的数据源加工需求</span>
        </div>
        {requests.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {requests.map((r: any) => (
              <div key={r.id} className="px-5 py-3.5 flex items-start gap-3">
                <MessageSquare size={14} className="text-gray-300 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{r.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-400">{r.created_at?.replace('T', ' ').slice(0, 16)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      r.status === 'done' ? 'bg-green-50 text-green-600' :
                      r.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status === 'done' ? '已完成' : r.status === 'in_progress' ? '处理中' : '待处理'}
                    </span>
                  </div>
                  {r.response && (
                    <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">{r.response}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">暂无需求记录</div>
        )}
      </div>

      {/* Submit Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[480px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">提交数据源加工需求</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-gray-500 mb-3">
                描述你希望对数据源做的加工处理，例如增加字段、数据清洗规则等
              </p>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="例如：希望增加「会话时长」字段，记录每通会话从开始到结束的总时长..."
                className="w-full h-28 px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                取消
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={!newDesc.trim() || submitting}
                className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
              >
                {submitting ? '提交中...' : '提交需求'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
