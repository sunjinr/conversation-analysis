import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { LayoutDashboard, Layers, Search, Settings, Database, LogOut, Lightbulb, ChevronDown } from 'lucide-react'

const insightChildren = [
  { to: '/analysis/dimensions', icon: Layers, label: '洞察维度' },
  { to: '/analysis/runs', icon: Search, label: '洞察' },
]

const topLinks = [
  { to: '/analysis', icon: LayoutDashboard, label: '概览', end: true },
]

const bottomLinks = [
  { to: '/analysis/sessions', icon: Database, label: '数据' },
  { to: '/analysis/settings', icon: Settings, label: '设置' },
]

const linkClass = (isActive: boolean) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mt-0.5 ${
    isActive ? 'bg-sidebar-active text-gray-900 font-medium' : 'text-gray-500 hover:bg-sidebar-hover hover:text-gray-800'
  }`

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const insightActive = insightChildren.some(c => location.pathname.startsWith(c.to))
  const [insightOpen, setInsightOpen] = useState(true)

  return (
    <aside className="w-[240px] bg-sidebar text-gray-800 flex flex-col shrink-0 border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <img src="/skisight-logo.png" alt="SkiSight" className="w-8 h-8 rounded-lg" />
          <h1 className="text-[17px] font-bold tracking-tight" style={{ fontFamily: "'Tiempos Text', 'Iowan Old Style', 'Sitka Text', Cambria, Georgia, serif" }}>
          SkiSight
          <span className="font-normal text-[17px] text-gray-500">洞察平台</span>
        </h1>
        </div>
        <p className="text-[10px] text-[#AEAEB2] mt-2 leading-relaxed">Powered by SKILLS & SANDBOX</p>
        <p className="text-[10px] text-[#AEAEB2] leading-relaxed">Created by Matt</p>
      </div>

      <nav className="flex-1 py-3 px-3 overflow-auto">
        {topLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => linkClass(isActive)}>
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}

        <button
          onClick={() => setInsightOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mt-0.5 ${
            insightActive ? 'bg-sidebar-active text-gray-900 font-medium' : 'text-gray-500 hover:bg-sidebar-hover hover:text-gray-800'
          }`}
        >
          <Lightbulb size={18} />
          <span className="flex-1 text-left">Insight</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${insightOpen ? '' : '-rotate-90'}`} />
        </button>
        {insightOpen && (
          <div className="ml-3 pl-3 border-l border-sidebar-border">
            {insightChildren.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors mt-0.5 ${
                    isActive ? 'text-gray-900 font-medium bg-sidebar-active' : 'text-gray-400 hover:text-gray-700 hover:bg-sidebar-hover'
                  }`
                }
              >
                <link.icon size={15} />
                {link.label}
              </NavLink>
            ))}
          </div>
        )}

        {bottomLinks.map(link => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => linkClass(isActive)}>
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center text-xs font-medium text-accent">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-[#86868B]">{user?.role}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="text-gray-400 hover:text-gray-700 p-1">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
