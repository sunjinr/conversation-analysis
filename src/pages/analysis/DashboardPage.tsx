import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { TrendingUp, Users, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Modern tooltip matching the reference style
const ModernTooltip = ({ active, payload, label, metricName, metricLabel }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '12px',
        minWidth: '140px',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 500, opacity: 0.7 }}>{label}</p>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
          {data[metricName]}%
        </p>
      </div>
    )
  }
  return null
}

// Mock insight marker data for 0321
const INSIGHT_MARKERS = [{ date: '2026-03-21', insightName: '支付失败不满洞察0321' }]

const addInsightMarker = (data: any[]) => {
  return data.map(d => {
    const marker = INSIGHT_MARKERS.find(m => m.date === d.date)
    return { ...d, insightDate: marker ? d.date : null, insightName: marker ? marker.insightName : null }
  })
}

// Combined tooltip for both chart data and insight markers
const CombinedTooltip = ({ active, payload, metricName }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload
    if (data[metricName] === undefined || data[metricName] === null) return null
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '12px',
        minWidth: '140px',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 500, opacity: 0.7 }}>{data.date}</p>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
          {Math.round(data[metricName] * 10) / 10}%
        </p>
        {data.insightName && (
          <p style={{ margin: '6px 0 0 0', padding: '4px 0 0 0', borderTop: '1px solid rgba(255,255,255,0.15)', color: '#10B981', fontWeight: 600, fontSize: '11px' }}>
            <Zap size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
            洞察：{data.insightName}
          </p>
        )}
      </div>
    )
  }
  return null
}

// Smooth gradient area chart component
const SmoothAreaChart = ({ data, dataKey, color, gradientId, height = 240 }: any) => {
  const gradientColors: Record<string, [string, string]> = {
    orange: ['#E8735A', 'rgba(232,115,90,0)'],
    blue: ['#3B82F6', 'rgba(59,130,246,0)'],
    green: ['#10B981', 'rgba(16,185,129,0)'],
    purple: ['#8B5CF6', 'rgba(139,92,246,0)'],
    cyan: ['#06B6D4', 'rgba(6,182,212,0)'],
  }
  const [top, bottom] = gradientColors[color] || gradientColors.orange

  const dataWithMarkers = addInsightMarker(data)
  const maxVal = Math.max(...data.map((d: any) => d[dataKey] || 0))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={dataWithMarkers} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={top} stopOpacity={0.3} />
            <stop offset="95%" stopColor={bottom} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickFormatter={d => d.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CombinedTooltip metricName={dataKey} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={top}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={(props: any) => {
            const { cx, cy, payload } = props
            if (payload.insightName) {
              return <circle key={`insight-${cx}`} cx={cx} cy={cy} r={6} fill="#10B981" stroke="#fff" strokeWidth={2} style={{ cursor: 'pointer' }} />
            }
            return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={0} fill="transparent" />
          }}
          activeDot={{ r: 5, fill: top, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Compact stat bar chart for quick overview
const StatBarChart = ({ data, dataKey, color }: any) => {
  const colors: Record<string, string> = {
    orange: '#E8735A',
    blue: '#3B82F6',
    green: '#10B981',
  }
  const strokeColor = colors[color] || colors.orange

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          tickFormatter={d => d.slice(5)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey={dataKey} fill={strokeColor} radius={[4, 4, 0, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function DashboardPage() {
  const [dashboardSummary, setDashboardSummary] = useState<any>(null)
  const [satisfactionData, setSatisfactionData] = useState<any[]>([])
  const [sellerSatisfactionData, setSellerSatisfactionData] = useState<any[]>([])
  const [buyerTransferData, setBuyerTransferData] = useState<any[]>([])
  const [sellerTransferData, setSellerTransferData] = useState<any[]>([])

  useEffect(() => {
    api.getDashboardSummary().then(setDashboardSummary)
    api.getMetricsSatisfaction().then((data) => {
      setSatisfactionData(data)
      // 商家满意率直接使用买家满意率数据
      setSellerSatisfactionData(data)
    })
    Promise.all([
      api.getMetricsTransferRate('buyer'),
      api.getMetricsTransferRate('seller'),
    ]).then(([buyer, seller]) => {
      setBuyerTransferData(buyer)
      setSellerTransferData(seller)
    })
  }, [])

  // Calculate latest metrics (round to 1 decimal)
  const latestSatisfaction = satisfactionData.length > 0 ? Math.round(satisfactionData[satisfactionData.length - 1].satisfaction_rate * 10) / 10 : null
  const latestSellerSatisfaction = sellerSatisfactionData.length > 0 ? Math.round(sellerSatisfactionData[sellerSatisfactionData.length - 1].satisfaction_rate * 10) / 10 : null
  const latestBuyerTransfer = buyerTransferData.length > 0 ? Math.round(buyerTransferData[buyerTransferData.length - 1].transfer_rate * 10) / 10 : null
  const latestSellerTransfer = sellerTransferData.length > 0 ? Math.round(sellerTransferData[sellerTransferData.length - 1].transfer_rate * 10) / 10 : null

  // Calculate changes (round to 1 decimal)
  const calcChange = (data: any[], key: string) => {
    if (data.length < 2) return null
    const current = Math.round(data[data.length - 1][key] * 10) / 10
    const prev = Math.round(data[data.length - 2][key] * 10) / 10
    const diff = Math.round((current - prev) * 10) / 10
    return { value: diff >= 0 ? `+${diff}` : `${diff}`, positive: diff >= 0 }
  }

  const satisfactionChange = calcChange(satisfactionData, 'satisfaction_rate')
  const sellerSatisfactionChange = calcChange(sellerSatisfactionData, 'satisfaction_rate')
  const buyerChange = calcChange(buyerTransferData, 'transfer_rate')
  const sellerChange = calcChange(sellerTransferData, 'transfer_rate')

  const stats = [
    { label: '买家满意率', value: latestSatisfaction !== null ? `${latestSatisfaction}%` : '-', icon: TrendingUp, color: 'bg-orange-50 text-orange-500', change: satisfactionChange, data: satisfactionData, dataKey: 'satisfaction_rate', chartColor: 'orange' as const, gradientId: 'gradSatisfaction' },
    { label: '商家满意率', value: latestSellerSatisfaction !== null ? `${latestSellerSatisfaction}%` : '-', icon: TrendingUp, color: 'bg-cyan-50 text-cyan-500', change: sellerSatisfactionChange, data: sellerSatisfactionData, dataKey: 'satisfaction_rate', chartColor: 'cyan' as const, gradientId: 'gradSellerSat' },
    { label: '买家转人工率', value: latestBuyerTransfer !== null ? `${latestBuyerTransfer}%` : '-', icon: Users, color: 'bg-blue-50 text-blue-500', change: buyerChange, data: buyerTransferData, dataKey: 'transfer_rate', chartColor: 'blue' as const, gradientId: 'gradBuyer' },
    { label: '商家转人工率', value: latestSellerTransfer !== null ? `${latestSellerTransfer}%` : '-', icon: Users, color: 'bg-purple-50 text-purple-500', change: sellerChange, data: sellerTransferData, dataKey: 'transfer_rate', chartColor: 'purple' as const, gradientId: 'gradSeller' },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">概览</h2>

      {/* Stats Cards - 4 equal width */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={18} />
              </div>
              {s.change && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  s.change.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                }`}>
                  {s.change.value}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts - 4 metrics in 2x2 grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Buyer Satisfaction */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">买家满意率</h3>
            {latestSatisfaction !== null && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">最新: {latestSatisfaction}%</span>
            )}
          </div>
          {satisfactionData.length > 0 ? (
            <SmoothAreaChart data={satisfactionData} dataKey="satisfaction_rate" color="orange" gradientId="gradSatisfaction" height={200} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">暂无满意率数据</div>
          )}
        </div>

        {/* Seller Satisfaction */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">商家满意率</h3>
            {latestSellerSatisfaction !== null && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">最新: {latestSellerSatisfaction}%</span>
            )}
          </div>
          {sellerSatisfactionData.length > 0 ? (
            <SmoothAreaChart data={sellerSatisfactionData} dataKey="satisfaction_rate" color="cyan" gradientId="gradSellerSat" height={200} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">暂无满意率数据</div>
          )}
        </div>

        {/* Buyer Transfer */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">买家转人工率</h3>
            {latestBuyerTransfer !== null && (
              <span className="text-xs text-gray-400">{latestBuyerTransfer}%</span>
            )}
          </div>
          {buyerTransferData.length > 0 ? (
            <SmoothAreaChart data={buyerTransferData} dataKey="transfer_rate" color="blue" gradientId="gradBuyer" height={200} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
          )}
        </div>

        {/* Seller Transfer */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">商家转人工率</h3>
            {latestSellerTransfer !== null && (
              <span className="text-xs text-gray-400">{latestSellerTransfer}%</span>
            )}
          </div>
          {sellerTransferData.length > 0 ? (
            <SmoothAreaChart data={sellerTransferData} dataKey="transfer_rate" color="purple" gradientId="gradSeller" height={200} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  )
}
