import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, Save, Users, Bell } from 'lucide-react'

export default function SettingsPage() {
  const [team, setTeam] = useState<any[]>([])
  const [dingtalk, setDingtalk] = useState({ webhook_url: '', secret: '', enabled: true })
  const [newMember, setNewMember] = useState({ name: '', role_description: '', email: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getTeam().then(setTeam)
    api.getSettings().then(s => { if (s.dingtalk) setDingtalk(s.dingtalk) })
  }, [])

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

  const saveDingtalk = async () => {
    setSaving(true)
    await api.updateSettings({ dingtalk })
    setSaving(false)
    alert('保存成功')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-gray-900">设置</h2>

      {/* Team Members */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-accent" />
          <h3 className="text-sm font-semibold text-gray-700">团队成员</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">配置团队成员和角色描述，分析完成后任务会自动推荐给匹配的成员</p>

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

      {/* DingTalk */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-accent" />
          <h3 className="text-sm font-semibold text-gray-700">钉钉通知</h3>
        </div>
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
