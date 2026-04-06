import { Router } from 'express'
import db from '../db.js'
import { v4 as uuid } from 'uuid'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { matchScenario } from '../services/scenario-matcher.js'

const router = Router()

// GET all scenarios
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM scenarios ORDER BY created_at DESC').all()
  res.json(rows)
})

// POST create scenario → auto-trigger matching in background
router.post('/', authMiddleware, (req: AuthRequest, res) => {
  const { name, description, date_from, date_to } = req.body
  if (!name || !description) return res.status(400).json({ error: 'name and description required' })
  const id = uuid()
  db.prepare('INSERT INTO scenarios (id, name, description, date_from, date_to, match_status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, description, date_from || null, date_to || null, 'pending', req.user?.id)

  // Auto-trigger matching in background (don't await)
  matchScenario(id).catch(err => {
    console.error(`[Scenario] Auto-match failed for ${id}:`, err.message)
  })

  res.json({ id, name, description, match_status: 'pending' })
})

// GET single scenario
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

// PUT update scenario → re-trigger matching
router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  const { name, description, date_from, date_to } = req.body
  db.prepare("UPDATE scenarios SET name = COALESCE(?, name), description = COALESCE(?, description), date_from = ?, date_to = ?, match_status = 'pending', matched_count = 0, matched_session_ids = '[]' WHERE id = ?")
    .run(name, description, date_from || null, date_to || null, req.params.id)

  // Re-trigger matching
  matchScenario(req.params.id).catch(err => {
    console.error(`[Scenario] Re-match failed for ${req.params.id}:`, err.message)
  })

  res.json({ ok: true, match_status: 'pending' })
})

// DELETE scenario
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  db.prepare('DELETE FROM scenarios WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// POST retry matching (for failed scenarios)
router.post('/:id/rematch', authMiddleware, async (req: AuthRequest, res) => {
  const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id) as any
  if (!scenario) return res.status(404).json({ error: 'Not found' })

  // Trigger matching in background
  matchScenario(scenario.id).catch(err => {
    console.error(`[Scenario] Rematch failed for ${scenario.id}:`, err.message)
  })

  res.json({ ok: true, match_status: 'matching' })
})

// GET matched sessions for a scenario (with sample + pagination)
router.get('/:id/matched-sessions', (req, res) => {
  const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id) as any
  if (!scenario) return res.status(404).json({ error: 'Not found' })

  let sessionIds: string[] = []
  try { sessionIds = JSON.parse(scenario.matched_session_ids || '[]') } catch {}

  if (sessionIds.length === 0) {
    return res.json({ total: 0, sample: null, sessions: [] })
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 200)
  const offset = parseInt(req.query.offset as string) || 0

  // Get sample (first matched session with full data)
  const placeholders = sessionIds.map(() => '?').join(',')
  const sample = db.prepare(`
    SELECT s.*, ss.summary_text, ss.key_topics
    FROM sessions s
    LEFT JOIN session_summaries ss ON ss.session_id = s.id
    WHERE s.id IN (${placeholders})
    ORDER BY s.sequence_num ASC LIMIT 1
  `).get(...sessionIds) as any

  // Get paginated list (id + summary only for listing)
  const paginatedIds = sessionIds.slice(offset, offset + limit)
  const sessions = paginatedIds.length > 0
    ? db.prepare(`
        SELECT s.id, s.sequence_num, s.session_id, s.session_date, s.dissatisfaction_info,
               ss.summary_text, ss.key_topics
        FROM sessions s
        LEFT JOIN session_summaries ss ON ss.session_id = s.id
        WHERE s.id IN (${paginatedIds.map(() => '?').join(',')})
        ORDER BY s.sequence_num ASC
      `).all(...paginatedIds) as any[]
    : []

  res.json({ total: sessionIds.length, sample, sessions })
})

// GET export matched sessions as CSV
router.get('/:id/export', (req, res) => {
  const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id) as any
  if (!scenario) return res.status(404).json({ error: 'Not found' })

  let sessionIds: string[] = []
  try { sessionIds = JSON.parse(scenario.matched_session_ids || '[]') } catch {}

  if (sessionIds.length === 0) {
    return res.status(400).json({ error: 'No matched sessions' })
  }

  const placeholders = sessionIds.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT s.sequence_num, s.session_id, s.user_id, s.ocs_session_id,
           s.bot_conversation, s.human_conversation, s.dissatisfaction_info,
           s.session_date, ss.summary_text, ss.key_topics
    FROM sessions s
    LEFT JOIN session_summaries ss ON ss.session_id = s.id
    WHERE s.id IN (${placeholders})
    ORDER BY s.sequence_num ASC
  `).all(...sessionIds) as any[]

  // Build CSV
  const headers = ['序号', '会话ID', '用户ID', 'OCS会话ID', 'AI客服对话', '人工客服对话', '不满意信息', '会话日期', '摘要', '关键词']
  const fields = ['sequence_num', 'session_id', 'user_id', 'ocs_session_id', 'bot_conversation', 'human_conversation', 'dissatisfaction_info', 'session_date', 'summary_text', 'key_topics']

  const csvRows = [headers.join(',')]
  for (const row of rows) {
    const vals = fields.map(f => {
      const v = (row as any)[f]
      if (v == null) return ''
      const str = String(v).replace(/"/g, '""')
      return `"${str}"`
    })
    csvRows.push(vals.join(','))
  }

  const csv = '\uFEFF' + csvRows.join('\n')  // BOM for Excel UTF-8

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  const safeName = encodeURIComponent(scenario.name)
  res.setHeader('Content-Disposition', `attachment; filename="scenario-${safeName}.csv"; filename*=UTF-8''scenario-${safeName}.csv`)
  res.send(csv)
})

export default router
