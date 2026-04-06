import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, Save, Users, Bell, MessageSquare, Eye, X } from 'lucide-react'

type TabKey = 'team' | 'dingtalk' | 'feedback'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('team')

  const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
    { key: 'team', label: '团队管理', icon: Users },
    { key: 'dingtalk', label: '钉钉通知', icon: Bell },
    { key: 'feedback', label: '负反馈库', icon: MessageSquare },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">设置</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'team' && <TeamTab />}
      {activeTab === 'dingtalk' && <DingtalkTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
    </div>
  )
}

function TeamTab() {
  const [team, setTeam] = useState<any[]>([])
  const [newMember, setNewMember] = useState({ name: '', role_description: '', email: '' })

  useEffect(() => { api.getTeam().then(setTeam) }, [])

  const addMember = async () => {
    if (!newMember.name || !newMember.role_description) return
    await api.addMember(newMember)
    setNewMember({ name: '', role_description: '', email: '' })
    api.getTeam().then(setTeam)
  }

  const removeMember = async (id: string) => {
    await api.deleteMember(id)
    api.getTeam().then(setTeam)
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 mb-4">配置团队成员和角色描述，洞察完成后任务会自动推荐给匹配的成员</p>
        <div className="space-y-2 mb-4">
          {team.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">{m.name}</span>
                <span className="text-xs text-gray-400 ml-2">{m.role_description}</span>
              </div>
              <button onClick={() => removeMember(m.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newMember.name} onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
            placeholder="姓名" className="w-28 px-2 py-1.5 border border-gray-200 rounded text-sm" />
          <input value={newMember.role_description} onChange={e => setNewMember(m => ({ ...m, role_description: e.target.value }))}
            placeholder="角色描述（如：负责退款问题）" className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm" />
          <button onClick={addMember} className="flex items-center gap-1 px-3 py-1.5 bg-brand text-white rounded text-sm">
            <Plus size={14} /> 添加
          </button>
        </div>
      </div>
    </div>
  )
}

function DingtalkTab() {
  const [dingtalk, setDingtalk] = useState({ webhook_url: '', secret: '', enabled: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.getSettings().then(s => { if (s.dingtalk) setDingtalk(s.dingtalk) }) }, [])

  const saveDingtalk = async () => {
    setSaving(true)
    await api.updateSettings({ dingtalk })
    setSaving(false)
    alert('保存成功')
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Webhook URL</label>
            <input value={dingtalk.webhook_url} onChange={e => setDingtalk(d => ({ ...d, webhook_url: e.target.value }))}
              placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">签名密钥（可选）</label>
            <input value={dingtalk.secret} onChange={e => setDingtalk(d => ({ ...d, secret: e.target.value }))}
              placeholder="SEC..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dingtalk.enabled} onChange={e => setDingtalk(d => ({ ...d, enabled: e.target.checked }))} className="rounded" />
            启用钉钉通知
          </label>
          <button onClick={saveDingtalk} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm">
            <Save size={14} /> {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState({ keyword: '' })
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<any>(null)
  const PAGE_SIZE = 20

  const load = () => {
    api.getFeedbacks({ ...filter, limit: PAGE_SIZE, offset: page * PAGE_SIZE }).then(r => {
      setFeedbacks(r.data)
      setTotal(r.total)
    })
  }

  useEffect(() => { load() }, [page])

  const search = () => { setPage(0); load() }

  const deleteFeedback = async (id: string) => {
    if (!confirm('确认删除该反馈？')) return
    await api.deleteFeedback(id)
    load()
    if (detail?.id === id) setDetail(null)
  }

  const formatTime = (t: string) => {
    if (!t) return '-'
    const d = new Date(t.replace(' ', 'T') + 'Z')
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const parseRowData = (json: string): string[] => {
    try { return JSON.parse(json) } catch { return [] }
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <input value={filter.keyword} onChange={e => setFilter(f => ({ ...f, keyword: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="搜索反馈内容..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        <button onClick={search} className="px-4 py-2 bg-brand text-white rounded-lg text-sm">搜索</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-2.5 font-medium text-gray-500">时间</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">来源洞察</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Sheet</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">反馈内容</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">暂无反馈数据</td></tr>
            ) : feedbacks.map(fb => (
              <tr key={fb.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{formatTime(fb.created_at)}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[120px] truncate">{fb.run_name || '-'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{fb.original_category || '-'}</td>
                <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">{fb.feedback_note}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDetail(fb)} className="text-gray-400 hover:text-brand" title="查看详情"><Eye size={14} /></button>
                    <button onClick={() => deleteFeedback(fb.id)} className="text-gray-400 hover:text-red-500" title="删除"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>共 {total} 条</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40">上一页</button>
              <span className="px-2 py-1">{page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
                className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40">下一页</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/30 flex justify-end z-50" onClick={() => setDetail(null)}>
          <div className="bg-white w-full max-w-md h-full shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">反馈详情</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">来源洞察</div>
                <div className="text-sm text-gray-700">{detail.run_name || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Sheet / 分类</div>
                <div className="text-sm text-gray-700">{detail.original_category || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">反馈内容</div>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{detail.feedback_note}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">提交人</div>
                <div className="text-sm text-gray-700">{detail.submitter_name || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">提交时间</div>
                <div className="text-sm text-gray-700">{formatTime(detail.created_at)}</div>
              </div>
              {detail.detail_row_json && detail.detail_row_json !== '{}' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">关联数据行</div>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                    {parseRowData(detail.detail_row_json).map((v: string, i: number) => (
                      v ? <div key={i} className="text-xs text-gray-600 truncate">{v}</div> : null
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
