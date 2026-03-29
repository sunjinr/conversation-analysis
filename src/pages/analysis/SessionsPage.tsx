import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Upload, Sparkles, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [summarized, setSummarized] = useState(0)
  const [page, setPage] = useState(0)
  const [importing, setImporting] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [sumProgress, setSumProgress] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const pageSize = 30

  const load = () => {
    api.getSessions(pageSize, page * pageSize).then(res => {
      setSessions(res.data)
      setTotal(res.total)
      setSummarized(res.summarized)
    })
  }

  useEffect(() => { load() }, [page])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws) as any[]

      const mapped = rows.map((r: any, i: number) => ({
        sequence_num: r['序号'] || i + 1,
        session_id: r['session_id'] || '',
        user_id: r['user_id'] || '',
        ocs_session_id: r['ocs_session_id'] || '',
        bot_conversation: r['会员与机器人对话'] || '',
        human_conversation: r['会员与客服对话'] || '',
        dissatisfaction_info: r['会员点击不满意'] || '',
      }))

      await api.importSessions(mapped)
      setPage(0)
      load()
    } catch (err: any) {
      alert('Import failed: ' + err.message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSummarize = async () => {
    setSummarizing(true)
    setSumProgress('Starting...')
    let done = false
    while (!done) {
      try {
        const res = await api.summarizeSessions(10)
        done = res.done
        setSumProgress(`已总结 ${summarized + res.processed} / ${total}，剩余 ${res.remaining}`)
        if (!done) setSummarized(prev => prev + res.processed)
      } catch (err: any) {
        setSumProgress('Error: ' + err.message)
        break
      }
    }
    setSummarizing(false)
    load()
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">会话数据</h2>
          <p className="text-sm text-gray-500 mt-1">共 {total} 条会话，已总结 {summarized} 条</p>
        </div>
        <div className="flex gap-3">
          <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload size={16} />
            {importing ? '导入中...' : '导入 XLSX'}
          </button>
          {total > 0 && summarized < total && (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light disabled:opacity-50"
            >
              <Sparkles size={16} />
              {summarizing ? sumProgress : '生成会话总结'}
            </button>
          )}
        </div>
      </div>

      {summarizing && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            {sumProgress}
          </div>
          <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${total > 0 ? (summarized / total * 100) : 0}%` }} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3 w-16">#</th>
              <th className="px-4 py-3">Session ID</th>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">不满意</th>
              <th className="px-4 py-3">摘要</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s: any) => (
              <tr
                key={s.id}
                onClick={() => navigate(`/analysis/sessions/${s.id}`)}
                className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer"
              >
                <td className="px-4 py-3 text-gray-400">{s.sequence_num}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{(s.session_id || '').slice(0, 12)}...</td>
                <td className="px-4 py-3 text-gray-500">{s.session_date}</td>
                <td className="px-4 py-3">
                  {s.dissatisfaction_info?.includes('点了不满意') && <span className="badge badge-urgent">不满意</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{s.summary_text || <span className="text-gray-300">未总结</span>}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">暂无数据，请导入 XLSX 文件</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">第 {page + 1} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
