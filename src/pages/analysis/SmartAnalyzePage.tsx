import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Loader2 } from 'lucide-react'

export default function SmartAnalyzePage() {
  const [question, setQuestion] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const navigate = useNavigate()

  const handleAnalyze = async () => {
    if (!question.trim()) return
    setAnalyzing(true)
    setProgress('正在解析分析意图...')

    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/skill/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ user_question: question }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || '分析失败')
      }

      setProgress(`分析完成！共分析 ${data.summary.analyzed} 条会话`)

      // 跳转到结果页或下载
      setTimeout(() => {
        window.open(data.report_url, '_blank')
        navigate('/analysis/runs')
      }, 1500)
    } catch (e: any) {
      setProgress(`分析失败: ${e.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const examples = [
    '202603的客户修改邮箱相关会话，不满意原因主要是什么？',
    '退款问题会话中，主要不满原因有哪些？',
    '物流问题相关会话分析，客户最不满意什么？',
  ]

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900 mb-2">智能分析</h2>
      <p className="text-sm text-gray-500 mb-6">输入你的分析问题，系统将自动调用 Skill 进行深度分析</p>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">分析诉求</label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="例如：202603的客户修改邮箱相关会话，不满意原因主要是什么？"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
          />
        </div>

        {/* 示例问题 */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-2">示例问题</label>
          <div className="space-y-2">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setQuestion(ex)}
                className="w-full text-left text-sm text-gray-600 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-accent/30 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* 进度提示 */}
        {progress && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2">
              {analyzing && <Loader2 size={16} className="animate-spin text-blue-600" />}
              <span className="text-sm text-blue-700">{progress}</span>
            </div>
          </div>
        )}

        {/* 分析按钮 */}
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !question.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-light disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Send size={16} />
              开始分析
            </>
          )}
        </button>
      </div>
    </div>
  )
}
