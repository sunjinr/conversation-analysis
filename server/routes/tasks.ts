import { Router } from 'express'
import db from '../db.js'
import { v4 as uuid } from 'uuid'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', (req, res) => {
  const status = req.query.status as string
  const assigneeId = req.query.assignee_id as string
  const runId = req.query.run_id as string

  let sql = 'SELECT t.*, d.name as dimension_name, tm.name as assignee_name FROM tasks t LEFT JOIN dimensions d ON d.id = t.dimension_id LEFT JOIN team_members tm ON tm.id = t.assignee_id WHERE 1=1'
  const params: any[] = []
  if (status) { sql += ' AND t.status = ?'; params.push(status) }
  if (assigneeId) { sql += ' AND t.assignee_id = ?'; params.push(assigneeId) }
  if (runId) { sql += ' AND t.run_id = ?'; params.push(runId) }
  sql += ' ORDER BY CASE t.priority WHEN \'urgent\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, t.created_at DESC'

  res.json(db.prepare(sql).all(...params))
})

// PUT /api/tasks/:id - update status
router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  const { status, resolution_text, assignee_id } = req.body
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any
  if (!task) return res.status(404).json({ error: 'Not found' })

  if (status === 'resolved' && resolution_text) {
    db.prepare("UPDATE tasks SET status = 'resolved', resolution_text = ?, resolved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(resolution_text, req.params.id)

    // Record satisfaction event
    const today = new Date().toISOString().slice(0, 10)
    const existing = db.prepare('SELECT * FROM satisfaction_events WHERE event_date = ?').get(today) as any
    if (existing) {
      const resolvedIds = JSON.parse(existing.task_resolved_ids || '[]')
      resolvedIds.push(req.params.id)
      db.prepare('UPDATE satisfaction_events SET task_resolved_ids = ?, task_resolved_count = ? WHERE id = ?')
        .run(JSON.stringify(resolvedIds), resolvedIds.length, existing.id)
    } else {
      db.prepare('INSERT INTO satisfaction_events (id, event_date, task_resolved_ids, notes) VALUES (?, ?, ?, ?)')
        .run(uuid(), today, JSON.stringify([req.params.id]), `Resolved: ${task.title}`)
    }
  } else if (status) {
    db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id)
  }

  if (assignee_id !== undefined) {
    db.prepare("UPDATE tasks SET assignee_id = ?, updated_at = datetime('now') WHERE id = ?").run(assignee_id, req.params.id)
  }

  res.json({ ok: true })
})

// POST /api/tasks/:id/feedback
router.post('/:id/feedback', authMiddleware, (req: AuthRequest, res) => {
  const { result_id, original_category, corrected_category, feedback_note } = req.body
  db.prepare('INSERT INTO classification_feedback (id, result_id, original_category, corrected_category, feedback_note, submitted_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuid(), result_id, original_category, corrected_category || '', feedback_note || '', req.user!.id)
  res.json({ ok: true })
})

export default router
