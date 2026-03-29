import { Request, Response, NextFunction } from 'express'
import db from '../db.js'

export interface AuthRequest extends Request {
  user?: { id: string; name: string; role: string }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers['x-auth-token'] as string
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' })
  }
  const user = db.prepare('SELECT id, name, role FROM users WHERE token = ?').get(token) as any
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' })
  }
  req.user = user
  next()
}
