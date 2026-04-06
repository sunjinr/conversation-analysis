import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Play, Loader2, ArrowLeft, Calendar } from 'lucide-react'

/**
 * 新建洞察页面
 * 三个模块竖向排列：
 * 1. 洞察名称
 * 2. 自由圈场景（自然语言描述分析诉求）
 * 3. 洞察维度选择（只展示"通用维度"及其13个预设类别）
 */
export default function NewRunPage() {
  const [name, setName] = useState('')
  const [question, setQuestion] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedDims, setSelectedDims] = useState<Set<string>>(new Set())
  const [dimensions, setDimensions] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.getDimensions().then(dims => {
      setDimensions(dims)
      // 默认选中"通用维度"
      const generic = dims.find((d: any) => d.name === '通用维度')
      if (generic) {
        setSelectedDims(new Set([generic.id]))
      }
    })
  }, [])

  const handleCreate = async () => {
    if (!question.trim()) {
      setError('请输入分析诉求')
      return
    }
    if (selectedDims.size === 0) {
      setError('请至少选择一个维度')
      return
    }

    setError('')
    setCreating(true)

    try {
      // 创建洞察任务，把用户问题作为 name 的一部分
      const runName = name.trim() || `洞察 ${new Date().toLocaleDateString('zh-CN')}`
      const res = await api.createRun({
        name: runName,
        scenario_id: null,
        dimension_ids: Array.from(selectedDims),
        user_question: question.trim(),
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })

      // 创建成功后自动开始处理
      try {
        await api.processRun(res.id, 50)
      } catch (e) {
        console.warn('Auto-process failed, will continue in background:', e)
      }

      // 跳转到洞察列表
      navigate('/analysis/runs')
    } catch (e: any) {
      setError(e.message || '创建失败')
      setCreating(false)
    }
  }

  const exampleQuestions = [
    '202603的客户支付失败相关会话，不满意原因主要是什么？',
    '分析最近一周的供应商纠纷会话，主要不满原因有哪些？',
    '退款问题会话在3月15号比3月14号的不满量变化是多少？',
  ]

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate('/analysis/runs')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> 返回洞察列表
      </button>
      <h2 className="text-xl font-bold text-gray-900 mb-6">发起洞察</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        {/* 模块一：洞察名称 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">洞察名称</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`洞察 ${new Date().toLocaleDateString('zh-CN')}`}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* 模块二：自由圈场景（分析诉求） */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">分析诉求</label>
          <p className="text-xs text-gray-400 mb-3">用自然语言描述你想分析的内容，AI 会自动识别主题并筛选相关会话</p>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="例：202603的客户支付失败相关会话，不满意原因主要是什么？"
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
          {/* 示例问题 */}
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-gray-400">示例：</p>
            {exampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuestion(q)}
                className="block w-full text-left text-xs px-3 py-2 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* 模块：日期范围 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            <Calendar size={14} className="inline mr-1 -mt-0.5" />日期范围
          </label>
          <p className="text-xs text-gray-400 mb-3">可选，限定分析的会话日期范围，留空则分析全部数据</p>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <span className="text-sm text-gray-400">至</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        {/* 模块三：洞察维度选择 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">洞察维度</label>
          <div className="space-y-2">
            {dimensions.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">暂无可用维度</p>
            )}
            {dimensions.map(d => (
              <label
                key={d.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDims.has(d.id)
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDims.has(d.id)}
                  onChange={() => {
                    setSelectedDims(prev => {
                      const next = new Set(prev)
                      next.has(d.id) ? next.delete(d.id) : next.add(d.id)
                      return next
                    })
                  }}
                  className="rounded border-gray-300 text-accent"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{d.name}</span>
                    {d.auto_discover && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">AI+挖掘</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{d.definition.slice(0, 100)}...</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
        )}

        {/* 发起洞察按钮 */}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              发起中...
            </>
          ) : (
            <>
              <Play size={16} />
              发起洞察
            </>
          )}
        </button>
      </div>
    </div>
  )
}
