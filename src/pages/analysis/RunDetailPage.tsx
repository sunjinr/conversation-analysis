import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { ArrowLeft, Download, Play, FileSpreadsheet, X } from 'lucide-react'
import DashboardInsightView from '@/components/analysis/DashboardInsightView'

export default function RunDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState<any>(null)
  const [processing, setProcessing] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState<{ sheet: string; row: string; rowData: string } | null>(null)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  const loadRun = () => {
    if (!id) return
    api.getRun(id).then(r => {
      setRun(r)
      // Check if this is a dashboard-type insight
      try {
        const summary = JSON.parse(r.summary_json || '{}')
        if (summary.viewType === 'dashboard') {
          loadDashboardData(id)
        }
      } catch {}
    })
  }

  const loadDashboardData = async (runId: string) => {
    setDashboardLoading(true)
    try {
      const data = await api.getRunDashboardData(runId)
      setDashboardData(data)
    } catch (e) {
      console.error('Failed to load dashboard data:', e)
    } finally {
      setDashboardLoading(false)
    }
  }

  useEffect(() => { loadRun() }, [id])

  // Listen for feedback postMessage from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'feedback') {
        setFeedbackModal({ sheet: e.data.sheet, row: e.data.row, rowData: e.data.rowData })
        setFeedbackNote('')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const submitFeedback = async () => {
    if (!feedbackModal || !feedbackNote.trim() || !id) return
    setSubmitting(true)
    try {
      await api.createFeedback({
        run_id: id,
        session_id: '',
        dimension_id: '',
        original_category: feedbackModal.sheet,
        feedback_note: feedbackNote.trim(),
        detail_row_json: feedbackModal.rowData,
      })
      setFeedbackModal(null)
      setFeedbackNote('')
      alert('反馈已提交')
    } catch (e: any) {
      alert('提交失败: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const startProcess = async () => {
    if (!id) return
    setProcessing(true)
    try {
      await api.processRun(id, 3)
      loadRun()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!run?.excel_report_path) return
    const a = document.createElement('a')
    a.href = `/api/runs/${id}/download-excel`
    a.download = `${run.name || '分析报告'}.xlsx`
    a.click()
  }

  if (!run) return <div className="text-gray-400">Loading...</div>

  const progress = run.total_sessions > 0 ? (run.processed_sessions / run.total_sessions * 100) : 0

  // Convert UTC datetime to local time
  const formatLocalTime = (utcStr: string | null | undefined) => {
    if (!utcStr) return '-'
    // SQLite stores as 'YYYY-MM-DD HH:MM:SS' in UTC
    const localDate = new Date(utcStr.replace(' ', 'T') + 'Z')
    return localDate.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/analysis/runs')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={14} /> 返回洞察列表
          </button>
          <h2 className="text-xl font-bold text-gray-900">{run.name || '洞察详情'}</h2>
          <p className="text-sm text-gray-500 mt-1">
            <span className={`badge badge-${run.status}`}>{run.status === 'completed' ? '已完成' : run.status === 'running' ? '分析中' : run.status}</span>
            {' '}| {run.total_sessions}条数据池 | {run.processed_sessions}条相关分析 | {(run.started_at || run.created_at)?.replace('T', ' ').slice(0, 16)}
          </p>
          {run.user_question && (
            <p className="text-sm text-gray-600 mt-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg inline-block max-w-xl truncate">
              <span className="text-gray-400 mr-1">Q:</span> {run.user_question}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {run.status === 'running' && (
            <button onClick={startProcess} disabled={processing} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand/90 disabled:opacity-50">
              {processing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  洞察中...
                </>
              ) : (
                <>
                  <Play size={16} /> 继续洞察
                </>
              )}
            </button>
          )}
          {run.status === 'completed' && run.excel_report_path && (
            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              <Download size={16} /> 下载 Excel 报告
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {run.status === 'running' && (
        <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex justify-between text-sm text-blue-700 mb-2">
            <span>洞察进度</span>
            <span>{run.processed_sessions} / {run.total_sessions}</span>
          </div>
          <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Dashboard loading state */}
      {run.status === 'completed' && dashboardLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400 text-sm">加载仪表板数据...</p>
          </div>
        </div>
      )}

      {/* Completed: Dashboard View */}
      {run.status === 'completed' && !dashboardLoading && dashboardData && (
        <DashboardInsightView run={run} dashboardData={dashboardData} />
      )}

      {/* Completed: embed Excel file via iframe */}
      {run.status === 'completed' && !dashboardLoading && !dashboardData && run.excel_report_path && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 120px)', minHeight: '800px' }}>
          {!iframeLoaded && !iframeError && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-gray-400 text-sm">加载 Excel 报告中...</p>
              </div>
            </div>
          )}
          {iframeError && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 mb-2">Excel 报告加载失败</p>
                <button onClick={handleDownload} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  <Download size={14} className="inline mr-1" /> 下载 Excel 文件
                </button>
              </div>
            </div>
          )}
          <iframe
            src={`/api/runs/${id}/view-excel`}
            className="w-full h-full border-0"
            title="Excel Report"
            onLoad={() => setIframeLoaded(true)}
            onError={() => setIframeError(true)}
            style={{ display: iframeLoaded ? 'block' : 'none' }}
          />
        </div>
      )}

      {/* No report available */}
      {run.status === 'completed' && !dashboardLoading && !dashboardData && !run.excel_report_path && (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <FileSpreadsheet size={56} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">暂无报告</p>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">提交反馈</h3>
              <button onClick={() => setFeedbackModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg p-3">
              <span className="font-medium text-gray-600">Sheet:</span> {feedbackModal.sheet}
              <span className="ml-3 font-medium text-gray-600">Row:</span> {feedbackModal.row}
            </div>
            <textarea
              value={feedbackNote}
              onChange={e => setFeedbackNote(e.target.value)}
              placeholder="请描述你认为分析结果不准确的原因..."
              className="w-full h-28 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setFeedbackModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={submitFeedback} disabled={submitting || !feedbackNote.trim()}
                className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50">
                {submitting ? '提交中...' : '提交反馈'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
