import { Router } from 'express'
import db from '../db.js'
import { v4 as uuid } from 'uuid'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', (req, res) => {
  const dingtalk = db.prepare('SELECT * FROM dingtalk_configs LIMIT 1').get() || null
  res.json({ dingtalk })
})

router.put('/', authMiddleware, (req: AuthRequest, res) => {
  const { dingtalk } = req.body
  if (dingtalk) {
    const existing = db.prepare('SELECT id FROM dingtalk_configs LIMIT 1').get() as any
    if (existing) {
      db.prepare('UPDATE dingtalk_configs SET webhook_url = ?, secret = ?, enabled = ? WHERE id = ?')
        .run(dingtalk.webhook_url, dingtalk.secret || '', dingtalk.enabled ? 1 : 0, existing.id)
    } else {
      db.prepare('INSERT INTO dingtalk_configs (id, webhook_url, secret, enabled, created_by) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), dingtalk.webhook_url, dingtalk.secret || '', dingtalk.enabled ? 1 : 0, req.user!.id)
    }
  }
  res.json({ ok: true })
})

export default router
