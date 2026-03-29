import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      await login(token.trim())
      navigate('/analysis')
    } catch (e: any) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg shadow-black/5 p-8 w-full max-w-md border border-[#EEECEA]">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-brand" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">会话分析平台</h1>
          <p className="text-gray-500 text-sm mt-1">输入 Token 登录</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="输入访问 Token"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading || !token.trim()}
            className="w-full bg-brand text-white py-3 rounded-xl text-sm font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
          <p className="text-xs text-gray-400 text-center">默认 Token: admin123</p>
        </div>
      </div>
    </div>
  )
}
