import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { BarChart3, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { DashboardSummary, SatisfactionPoint } from '@/lib/types'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [satisfaction, setSatisfaction] = useState<SatisfactionPoint[]>([])

  useEffect(() => {
    api.getDashboardSummary().then(setSummary)
    api.getSatisfaction().then(setSatisfaction)
  }, [])

  const stats = summary ? [
    { label: '总会话数', value: summary.total_sessions, icon: MessageSquare, color: 'bg-blue-50 text-blue-600' },
    { label: '满意率', value: `${summary.satisfaction_rate}%`, icon: BarChart3, color: 'bg-green-50 text-green-600' },
    { label: '待处理任务', value: summary.open_tasks + summary.claimed_tasks, icon: AlertTriangle, color: 'bg-orange-50 text-orange-600' },
    { label: '已解决任务', value: summary.resolved_tasks, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
  ] : []

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">概览</h2>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">满意度趋势</h3>
        {satisfaction.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={satisfaction}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis domain={[40, 70]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === 'satisfaction_rate') return [`${value}%`, '满意率']
                  if (name === 'tasks_resolved') return [value, '解决任务数']
                  return [value, name]
                }}
                labelFormatter={l => `日期: ${l}`}
              />
              <Line type="monotone" dataKey="satisfaction_rate" stroke="#E8735A" strokeWidth={2} dot={false} name="satisfaction_rate" />
              <Line type="monotone" dataKey="tasks_resolved" stroke="#10B981" strokeWidth={1.5} dot={{ r: 3 }} name="tasks_resolved" />
              {satisfaction.filter(s => s.tasks_resolved > 0).map(s => (
                <ReferenceLine key={s.date} x={s.date} stroke="#10B981" strokeDasharray="3 3" />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
            导入会话数据后显示趋势图
          </div>
        )}
      </div>

      {summary?.latest_run && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">最近洞察</h3>
          <p className="text-sm text-gray-500">
            状态: <span className={`badge badge-${summary.latest_run.status}`}>{summary.latest_run.status}</span>
            {' '}| 会话: {summary.latest_run.total_sessions}条
            {' '}| 时间: {summary.latest_run.created_at}
          </p>
        </div>
      )}
    </div>
  )
}
