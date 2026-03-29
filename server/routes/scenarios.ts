import { Router } from 'express'
import db from '../db.js'
import { v4 as uuid } from 'uuid'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { semanticSearch } from '../services/search.js'

const router = Router()

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM scenarios ORDER BY created_at DESC').all()
  res.json(rows)
})

router.post('/', authMiddleware, (req: AuthRequest, res) => {
  const { name, description, date_from, date_to } = req.body
  if (!name || !description) return res.status(400).json({ error: 'name and description required' })
  const id = uuid()
  db.prepare('INSERT INTO scenarios (id, name, description, date_from, date_to, created_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, description, date_from || null, date_to || null, req.user?.id)
  res.json({ id, name, description })
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  const { name, description, date_from, date_to } = req.body
  db.prepare('UPDATE scenarios SET name = COALESCE(?, name), description = COALESCE(?, description), date_from = ?, date_to = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(name, description, date_from || null, date_to || null, req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  db.prepare('DELETE FROM scenarios WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// POST /api/scenarios/:id/preview - run semantic search and cache results
router.post('/:id/preview', authMiddleware, async (req: AuthRequest, res) => {
  const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id) as any
  if (!scenario) return res.status(404).json({ error: 'Not found' })

  try {
    const results = await semanticSearch(scenario.description, scenario.date_from, scenario.date_to, 0.25, 500)
    const sessionIds = results.map(r => r.sessionId)
    db.prepare('UPDATE scenarios SET matched_session_ids = ?, matched_count = ? WHERE id = ?')
      .run(JSON.stringify(sessionIds), sessionIds.length, scenario.id)
    res.json({ matched_count: sessionIds.length, results: results.slice(0, 20) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
