import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { LayoutDashboard, MessageSquare, Target, Layers, Play, CheckSquare, Settings, LogOut } from 'lucide-react'

const links = [
  { to: '/analysis', icon: LayoutDashboard, label: '概览', end: true },
  { to: '/analysis/sessions', icon: MessageSquare, label: '会话数据' },
  { to: '/analysis/scenarios', icon: Target, label: '圈场景' },
  { to: '/analysis/dimensions', icon: Layers, label: '分析维度' },
  { to: '/analysis/runs', icon: Play, label: '分析任务' },
  { to: '/analysis/tasks', icon: CheckSquare, label: '待办任务' },
  { to: '/analysis/settings', icon: Settings, label: '设置' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="w-[240px] bg-[#1e1e2e] text-white flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-white/10">
        <h1 className="text-lg font-bold tracking-tight">CS Analysis</h1>
        <p className="text-xs text-gray-400 mt-0.5">会话分析与优化平台</p>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-auto">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-brand text-white font-medium' : 'text-gray-300 hover:bg-white/8 hover:text-white'
              }`
            }
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-brand/30 flex items-center justify-center text-xs font-medium">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="text-gray-400 hover:text-white p-1">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
