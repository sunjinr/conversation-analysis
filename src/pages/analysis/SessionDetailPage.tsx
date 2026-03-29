import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import ConversationViewer from '@/components/analysis/ConversationViewer'

export default function SessionDetailPage() {
  const { id } = useParams()
  const [session, setSession] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (id) api.getSession(id).then(setSession)
  }, [id])

  if (!session) return <div className="text-gray-400">Loading...</div>

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> 返回
      </button>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">会话信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">Session ID:</span> <span className="font-mono">{session.session_id}</span></div>
              <div><span className="text-gray-400">User ID:</span> <span className="font-mono">{session.user_id}</span></div>
              <div><span className="text-gray-400">日期:</span> {session.session_date}</div>
              <div><span className="text-gray-400">不满意:</span> {session.dissatisfaction_info?.includes('点了不满意') ? '是' : '否'}</div>
            </div>
            {session.summary_text && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>AI 总结:</strong> {session.summary_text}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">AI客服对话</h3>
            <ConversationViewer text={session.bot_conversation} />
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">人工客服对话</h3>
            <ConversationViewer text={session.human_conversation} />
          </div>
        </div>

        <div className="w-80 shrink-0">
          {session.dissatisfaction_info && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">不满意记录</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{session.dissatisfaction_info}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
