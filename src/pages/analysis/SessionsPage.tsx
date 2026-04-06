import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import { Database, Plus, Clock, MessageSquare, X, TrendingUp, Users } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

type TabType = 'source' | 'satisfaction' | 'transfer'

export default function SessionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('source')
  const historyRef = useRef<HTMLDivElement>(null)

  // Source tab state
  const [sample, setSample] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [columns, setColumns] = useState<string[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [newDesc, setNewDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Satisfaction tab state
  const [satisfactionData, setSatisfactionData] = useState<any[]>([])

  // Transfer rate tab state
  const [buyerTransferData, setBuyerTransferData] = useState<any[]>([])
  const [sellerTransferData, setSellerTransferData] = useState<any[]>([])

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

  const loadSatisfaction = () => {
    api.getMetricsSatisfaction().then(setSatisfactionData)
  }

  const loadTransferRates = () => {
    Promise.all([
      api.getMetricsTransferRate('buyer'),
      api.getMetricsTransferRate('seller'),
    ]).then(([buyer, seller]) => {
      setBuyerTransferData(buyer)
      setSellerTransferData(seller)
    })
  }

  useEffect(() => {
    loadSample()
    loadRequests()
    loadSatisfaction()
    loadTransferRates()
  }, [])

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'source', label: '服务会话数据源', icon: Database },
    { key: 'satisfaction', label: '买家满意率', icon: TrendingUp },
    { key: 'transfer', label: '转人工率', icon: Users },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">数据</h2>
          <p className="text-sm text-gray-500 mt-1">查看数据源、满意率和转人工率趋势</p>
        </div>
        {activeTab === 'source' && (
          <div className="flex items-center gap-3">
            {/* Request History Dropdown */}
            <div className="relative" ref={historyRef}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <Clock size={16} />
                需求历史
                {requests.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{requests.length}</span>
                )}
              </button>
              {showHistory && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-40 max-h-96 overflow-y-auto">
                  {requests.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {requests.map((r: any) => (
                        <div
                          key={r.id}
                          className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            setSelectedRequest(r)
                            setShowHistory(false)
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare size={14} className="text-gray-300 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 line-clamp-2">{r.description}</p>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="text-xs text-gray-400">{r.created_at?.replace('T', ' ').slice(0, 16)}</span>
                                {r.created_by && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{r.created_by}</span>
                                )}
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  r.status === 'done' ? 'bg-green-50 text-green-600' :
                                  r.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {r.status === 'done' ? '已完成' : r.status === 'in_progress' ? '处理中' : '待处理'}
                                </span>
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">暂无需求记录</div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light transition-colors"
            >
              <Plus size={16} />
              数据源加工提需
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'source' && (
        <>
          {/* Sample Record */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Database size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">数据样例</h3>
              <span className="text-xs text-gray-400 ml-2">
                当前数据源共 <span className="font-medium text-gray-700">{total}</span> 条会话记录，以下展示一条完整的数据样例
              </span>
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
        </>
      )}

      {activeTab === 'satisfaction' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">买家满意率数据</h3>
            <span className="text-xs text-gray-400 ml-2">
              共 <span className="font-medium text-gray-700">{satisfactionData.length}</span> 条记录
            </span>
          </div>
          {satisfactionData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">日期</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">满意率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {satisfactionData.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-800">{item.date}</td>
                      <td className="px-5 py-3 text-sm text-gray-800">{item.satisfaction_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-gray-400 text-sm">暂无满意率数据</div>
          )}
        </div>
      )}

      {activeTab === 'transfer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">买家转人工率数据</h3>
              <span className="text-xs text-gray-400 ml-2">
                共 <span className="font-medium text-gray-700">{buyerTransferData.length}</span> 条记录
              </span>
            </div>
            {buyerTransferData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">日期</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">转人工率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {buyerTransferData.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm text-gray-800">{item.date}</td>
                        <td className="px-5 py-3 text-sm text-gray-800">{item.transfer_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-12 text-center text-gray-400 text-sm">暂无买家转人工率数据</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">商家转人工率数据</h3>
              <span className="text-xs text-gray-400 ml-2">
                共 <span className="font-medium text-gray-700">{sellerTransferData.length}</span> 条记录
              </span>
            </div>
            {sellerTransferData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">日期</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">转人工率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sellerTransferData.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm text-gray-800">{item.date}</td>
                        <td className="px-5 py-3 text-sm text-gray-800">{item.transfer_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-12 text-center text-gray-400 text-sm">暂无商家转人工率数据</div>
            )}
          </div>
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelectedRequest(null)}>
          <div className="bg-white rounded-xl shadow-xl w-[560px] max-w-[90vw] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
              <h3 className="text-sm font-semibold text-gray-900">需求详情</h3>
              <button onClick={() => setSelectedRequest(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-5">
              {/* Status and Meta */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  selectedRequest.status === 'done' ? 'bg-green-50 text-green-600' :
                  selectedRequest.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {selectedRequest.status === 'done' ? '已完成' : selectedRequest.status === 'in_progress' ? '处理中' : '待处理'}
                </span>
                <span className="text-xs text-gray-400">
                  {selectedRequest.created_at?.replace('T', ' ').slice(0, 16)}
                </span>
                {selectedRequest.created_by && (
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    提交人: {selectedRequest.created_by}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">需求描述</h4>
                <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                  {selectedRequest.description}
                </div>
              </div>

              {/* Response */}
              {selectedRequest.response && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">处理回复</h4>
                  <div className="text-sm text-gray-800 bg-blue-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed border border-blue-100">
                    {selectedRequest.response}
                  </div>
                </div>
              )}

              {/* Updated At */}
              {selectedRequest.updated_at && selectedRequest.updated_at !== selectedRequest.created_at && (
                <div className="mt-4 text-xs text-gray-400 text-right">
                  最后更新: {selectedRequest.updated_at?.replace('T', ' ').slice(0, 16)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
