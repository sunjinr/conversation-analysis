import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.post('/login', (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'Token required' })

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE token = ?').get(token) as any
  if (!user) return res.status(401).json({ error: 'Invalid token' })

  res.json({ user, token })
})

export default router
