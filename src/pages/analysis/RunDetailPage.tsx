import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Play, Bell, Flag } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#06B6D4', '#84CC16']

export default function RunDetailPage() {
  const { id } = useParams()
  const [run, setRun] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [tab, setTab] = useState<'report' | 'results' | 'tasks'>('report')
  const [processing, setProcessing] = useState(false)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [feedbackData, setFeedbackData] = useState({ corrected_category: '', feedback_note: '' })
  const intervalRef = useRef<any>(null)

  const loadRun = () => {
    if (!id) return
    api.getRun(id).then(r => {
      setRun(r)
      if (r.status === 'completed') {
        api.getRunReport(id).then(setReport)
        api.getRunResults(id, 100).then(res => setResults(res.data))
        api.getTasks({ run_id: id }).then(setTasks)
      }
    })
  }

  useEffect(() => { loadRun() }, [id])

  const startProcess = async () => {
    if (!id) return
    setProcessing(true)
    const poll = async () => {
      try {
        const res = await api.processRun(id, 3)
        setRun((prev: any) => prev ? { ...prev, processed_sessions: res.processed, total_sessions: res.total } : prev)
        if (res.done) {
          setProcessing(false)
          loadRun()
        } else {
          intervalRef.current = setTimeout(poll, 500)
        }
      } catch (e: any) {
        setProcessing(false)
        alert(e.message)
      }
    }
    poll()
  }

  useEffect(() => () => { if (intervalRef.current) clearTimeout(intervalRef.current) }, [])

  const handleNotify = async () => {
    if (!id) return
    try { await api.sendDingTalk(id); alert('钉钉通知已发送') } catch (e: any) { alert(e.message) }
  }

  const handleFeedback = async (resultId: string, originalCategory: string) => {
    if (!feedbackData.corrected_category) return
    await api.submitFeedback(resultId, { result_id: resultId, original_category: originalCategory, ...feedbackData })
    setFeedbackId(null)
    setFeedbackData({ corrected_category: '', feedback_note: '' })
    alert('反馈已提交')
  }

  if (!run) return <div className="text-gray-400">Loading...</div>

  const progress = run.total_sessions > 0 ? (run.processed_sessions / run.total_sessions * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">分析详情</h2>
          <p className="text-sm text-gray-500 mt-1">
            <span className={`badge badge-${run.status}`}>{run.status}</span>
            {' '}| {run.total_sessions}条会话 | {run.created_at?.slice(0, 16)}
          </p>
        </div>
        <div className="flex gap-2">
          {run.status === 'running' && !processing && (
            <button onClick={startProcess} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm">
              <Play size={16} /> 继续分析
            </button>
          )}
          {run.status === 'running' && processing && (
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-brand/50 text-white rounded-lg text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              分析中 {run.processed_sessions}/{run.total_sessions}
            </button>
          )}
          {run.status === 'completed' && (
            <button onClick={handleNotify} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
              <Bell size={16} /> 推送钉钉
            </button>
          )}
        </div>
      </div>

      {(run.status === 'running') && (
        <div className="mb-6 bg-blue-50 rounded-xl p-4">
          <div className="flex justify-between text-sm text-blue-700 mb-2">
            <span>分析进度</span>
            <span>{run.processed_sessions} / {run.total_sessions}</span>
          </div>
          <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {run.status === 'completed' && (
        <>
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
            {(['report', 'results', 'tasks'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm transition-colors ${tab === t ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {{ report: '分析报告', results: '逐条结果', tasks: '生成任务' }[t]}
              </button>
            ))}
          </div>

          {tab === 'report' && report && (
            <div className="space-y-6">
              {report.dimensions?.map((dim: any) => (
                <div key={dim.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">{dim.name} ({dim.total}条)</h3>
                  <div className="flex gap-8">
                    <div className="w-64 h-64">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={dim.stats} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${(percent * 100).toFixed(0)}%`}>
                            {dim.stats.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1">
                      <table className="w-full text-sm">
                        <thead><tr className="text-xs text-gray-500"><th className="text-left pb-2">类别</th><th className="text-right pb-2">数量</th><th className="text-right pb-2">占比</th></tr></thead>
                        <tbody>
                          {dim.stats.map((s: any, i: number) => (
                            <tr key={i} className="border-t border-gray-50">
                              <td className="py-2 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                                {s.category}
                              </td>
                              <td className="text-right py-2">{s.count}</td>
                              <td className="text-right py-2 text-gray-500">{s.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'results' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left">维度</th>
                  <th className="px-4 py-3 text-left">分类</th>
                  <th className="px-4 py-3 text-left">置信度</th>
                  <th className="px-4 py-3 text-left">理由</th>
                  <th className="px-4 py-3 text-left w-20">反馈</th>
                </tr></thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id} className="border-t border-gray-50">
                      <td className="px-4 py-2 text-gray-600">{r.dimension_name}</td>
                      <td className="px-4 py-2 font-medium">{r.category}</td>
                      <td className="px-4 py-2 text-gray-500">{(r.confidence * 100).toFixed(0)}%</td>
                      <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{r.reasoning}</td>
                      <td className="px-4 py-2">
                        {feedbackId === r.id ? (
                          <div className="flex gap-1">
                            <input value={feedbackData.corrected_category} onChange={e => setFeedbackData(d => ({ ...d, corrected_category: e.target.value }))}
                              placeholder="正确类别" className="w-24 px-1 py-0.5 border rounded text-xs" />
                            <button onClick={() => handleFeedback(r.id, r.category)} className="text-xs text-brand">提交</button>
                            <button onClick={() => setFeedbackId(null)} className="text-xs text-gray-400">取消</button>
                          </div>
                        ) : (
                          <button onClick={() => setFeedbackId(r.id)} className="text-gray-400 hover:text-red-500" title="标记分类不准">
                            <Flag size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-3">
              {tasks.map(t => (
                <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                    <span className={`badge badge-${t.status}`}>{t.status}</span>
                    <span className="text-sm font-medium text-gray-900">{t.title}</span>
                  </div>
                  <p className="text-sm text-gray-500">{t.description}</p>
                </div>
              ))}
              {tasks.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">暂无生成任务</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
