import { Request, Response, NextFunction } from 'express'
import db from '../db.js'

export interface AuthRequest extends Request {
  user?: { id: string; name: string; role: string }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers['x-auth-token'] as string
  
  // 如果没有token，使用默认admin用户（开放访问）
  if (!token) {
    const defaultUser = db.prepare('SELECT id, name, role FROM users WHERE role = ? LIMIT 1').get('admin') as any
    if (defaultUser) {
      req.user = defaultUser
      return next()
    }
    return res.status(401).json({ error: 'No admin user found' })
  }
  
  const user = db.prepare('SELECT id, name, role FROM users WHERE token = ?').get(token) as any
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' })
  }
  req.user = user
  next()
}
