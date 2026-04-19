import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

interface DashboardInsightViewProps {
  run: any
  dashboardData: {
    resolutionStatus: { unresolved: number; resolved: number; invalid: number }
    unresolvedReasons: Array<{ name: string; count: number; percentage: number }>
    highFrequencyIssues: Array<{ name: string; count: number }>
    detailData: Array<{ seq: number; session_id: string; user_id: string; status: string; main_reason: string; sub_reason: string; description: string }>
  }
}

export default function DashboardInsightView({ run, dashboardData }: DashboardInsightViewProps) {
  const [detailExpanded, setDetailExpanded] = useState(false)
  const [detailPage, setDetailPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const PAGE_SIZE = 20

  const { resolutionStatus, unresolvedReasons, highFrequencyIssues, detailData } = dashboardData
  const total = resolutionStatus.unresolved + resolutionStatus.resolved + resolutionStatus.invalid
  const unresolvedRate = total > 0 ? ((resolutionStatus.unresolved / total) * 100).toFixed(1) : '0'

  // Resolution status pie data
  const resolutionPieData = [
    { name: '未解决', value: resolutionStatus.unresolved, color: '#EF4444' },
    { name: '已解决', value: resolutionStatus.resolved, color: '#10B981' },
    { name: '无效会话', value: resolutionStatus.invalid, color: '#9CA3AF' },
  ]

  // Filter detail data
  const filteredDetail = statusFilter === 'all' ? detailData : detailData.filter(d => d.status === statusFilter)
  const totalPages = Math.ceil(filteredDetail.length / PAGE_SIZE)
  const paginatedDetail = filteredDetail.slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE)

  const handleDownloadCSV = () => {
    const headers = ['序号', 'Session ID', 'User ID', '解决状态', '主要原因', '次要原因', '原因说明']
    const rows = detailData.map(d => [d.seq, d.session_id, d.user_id, d.status, d.main_reason, d.sub_reason, d.description])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${run.name}_明细数据.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">总会话数</p>
          <p className="text-3xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">未解决占比</p>
          <p className="text-3xl font-bold text-red-500">{unresolvedRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{resolutionStatus.unresolved} / {total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">已解决</p>
          <p className="text-3xl font-bold text-green-500">{resolutionStatus.resolved}</p>
          <p className="text-xs text-gray-400 mt-1">{total > 0 ? ((resolutionStatus.resolved / total) * 100).toFixed(1) : 0}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">无效会话</p>
          <p className="text-3xl font-bold text-gray-400">{resolutionStatus.invalid}</p>
          <p className="text-xs text-gray-400 mt-1">{total > 0 ? ((resolutionStatus.invalid / total) * 100).toFixed(1) : 0}%</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resolution Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">解决状态分布</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={resolutionPieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {resolutionPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value} 条`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Unresolved Reasons Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">未解决原因分布</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={unresolvedReasons} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `${value} 条`} />
              <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* High Frequency Issues */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">高频问题分布</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={highFrequencyIssues} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={70} interval={0} />
            <YAxis />
            <Tooltip formatter={(value: number) => `${value} 条`} />
            <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail Data Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setDetailExpanded(!detailExpanded)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">逐条明细</h3>
            <span className="text-sm text-gray-500">({filteredDetail.length} 条)</span>
          </div>
          {detailExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>

        {detailExpanded && (
          <div className="border-t border-gray-100">
            {/* Filter & Actions */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">筛选:</span>
                {['all', '未解决', '已解决', '无效会话'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setDetailPage(0) }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      statusFilter === f
                        ? 'bg-brand text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {f === 'all' ? '全部' : f}
                  </button>
                ))}
              </div>
              <button onClick={handleDownloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                <Download size={14} /> 导出 CSV
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">解决状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">主要原因</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原因说明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedDetail.map(row => (
                    <tr key={row.seq} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-500">{row.seq}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.session_id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.user_id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          row.status === '未解决' ? 'bg-red-50 text-red-600' :
                          row.status === '已解决' ? 'bg-green-50 text-green-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.main_reason || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-md truncate">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  第 {detailPage + 1} / {totalPages} 页，共 {filteredDetail.length} 条
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailPage(p => Math.max(0, p - 1))}
                    disabled={detailPage === 0}
                    className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setDetailPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={detailPage >= totalPages - 1}
                    className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
