import { Router } from 'express'
import db from '../db.js'
import { v4 as uuid } from 'uuid'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// POST /api/feedback - submit feedback
router.post('/', authMiddleware, (req: AuthRequest, res) => {
  const { run_id, session_id, dimension_id, original_category, feedback_note, detail_row_json } = req.body
  if (!feedback_note) return res.status(400).json({ error: 'feedback_note is required' })

  const id = uuid()
  db.prepare(`INSERT INTO classification_feedback
    (id, result_id, original_category, feedback_note, submitted_by, run_id, session_id, dimension_id, detail_row_json, status)
    VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, 'pending')`)
    .run(id, original_category || '', feedback_note, req.user!.id, run_id || '', session_id || '', dimension_id || '', detail_row_json || '{}')

  res.json({ ok: true, id })
})

// GET /api/feedback - list feedback with filters
router.get('/', (req, res) => {
  const { status, run_id, keyword, limit = '50', offset = '0' } = req.query as Record<string, string>

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (status) { where += ' AND cf.status = ?'; params.push(status) }
  if (run_id) { where += ' AND cf.run_id = ?'; params.push(run_id) }
  if (keyword) { where += ' AND (cf.feedback_note LIKE ? OR cf.original_category LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`) }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM classification_feedback cf ${where}`).get(...params) as any)?.cnt || 0

  const sql = `SELECT cf.*, u.name as submitter_name, ar.name as run_name
    FROM classification_feedback cf
    LEFT JOIN users u ON u.id = cf.submitted_by
    LEFT JOIN analysis_runs ar ON ar.id = cf.run_id
    ${where} ORDER BY cf.created_at DESC LIMIT ? OFFSET ?`

  const rows = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset))
  res.json({ data: rows, total })
})

// GET /api/feedback/run/:runId - feedback for a specific run
router.get('/run/:runId', (req, res) => {
  const rows = db.prepare(`SELECT cf.*, u.name as submitter_name
    FROM classification_feedback cf
    LEFT JOIN users u ON u.id = cf.submitted_by
    WHERE cf.run_id = ? ORDER BY cf.created_at DESC`).all(req.params.runId)
  res.json(rows)
})

// PUT /api/feedback/:id - update feedback status
router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  const { status, feedback_note } = req.body
  const existing = db.prepare('SELECT * FROM classification_feedback WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Feedback not found' })

  if (status) db.prepare('UPDATE classification_feedback SET status = ? WHERE id = ?').run(status, req.params.id)
  if (feedback_note !== undefined) db.prepare('UPDATE classification_feedback SET feedback_note = ? WHERE id = ?').run(feedback_note, req.params.id)

  res.json({ ok: true })
})

// DELETE /api/feedback/:id
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  db.prepare('DELETE FROM classification_feedback WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// GET /api/feedback/stats
router.get('/stats', (req, res) => {
  const total = (db.prepare('SELECT COUNT(*) as cnt FROM classification_feedback').get() as any).cnt
  const pending = (db.prepare("SELECT COUNT(*) as cnt FROM classification_feedback WHERE status = 'pending'").get() as any).cnt
  const reviewed = (db.prepare("SELECT COUNT(*) as cnt FROM classification_feedback WHERE status = 'reviewed'").get() as any).cnt
  const resolved = (db.prepare("SELECT COUNT(*) as cnt FROM classification_feedback WHERE status = 'resolved'").get() as any).cnt
  res.json({ total, pending, reviewed, resolved })
})

export default router
