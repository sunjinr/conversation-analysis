import { Router } from 'express'
import db from '../db.js'
import { v4 as uuid } from 'uuid'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { summarizeSession } from '../services/summarizer.js'
import { semanticSearch } from '../services/search.js'

const router = Router()

// GET /api/sessions - list with pagination
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0
  const dateFrom = req.query.date_from as string
  const dateTo = req.query.date_to as string

  let sql = 'SELECT s.*, ss.summary_text FROM sessions s LEFT JOIN session_summaries ss ON ss.session_id = s.id WHERE 1=1'
  const params: any[] = []
  if (dateFrom) { sql += ' AND s.session_date >= ?'; params.push(dateFrom) }
  if (dateTo) { sql += ' AND s.session_date <= ?'; params.push(dateTo) }
  sql += ' ORDER BY s.sequence_num ASC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const rows = db.prepare(sql).all(...params)
  const total = db.prepare('SELECT COUNT(*) as cnt FROM sessions').get() as any
  const summarized = db.prepare('SELECT COUNT(*) as cnt FROM session_summaries').get() as any

  res.json({ data: rows, total: total.cnt, summarized: summarized.cnt })
})

// GET /api/sessions/:id
router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT s.*, ss.summary_text, ss.key_topics
    FROM sessions s LEFT JOIN session_summaries ss ON ss.session_id = s.id
    WHERE s.id = ?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

// POST /api/sessions/import - bulk import
router.post('/import', authMiddleware, (req: AuthRequest, res) => {
  const { rows } = req.body as { rows: any[] }
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: 'rows array required' })

  // Clear existing
  db.prepare('DELETE FROM session_summaries').run()
  db.prepare('DELETE FROM sessions').run()

  const stmt = db.prepare(`INSERT INTO sessions (id, sequence_num, session_id, user_id, ocs_session_id, bot_conversation, human_conversation, dissatisfaction_info, session_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  const insert = db.transaction((items: any[]) => {
    for (const r of items) {
      // Extract date from conversation timestamps
      let sessionDate = ''
      const botConv = r.bot_conversation || r['会员与机器人对话'] || ''
      const humanConv = r.human_conversation || r['会员与客服对话'] || ''
      const dateMatch = (botConv || humanConv).match(/\[(\d{4}-\d{2}-\d{2})/)
      if (dateMatch) sessionDate = dateMatch[1]

      stmt.run(
        uuid(),
        r.sequence_num || r['序号'] || 0,
        r.session_id || '',
        r.user_id || '',
        r.ocs_session_id || '',
        botConv,
        humanConv,
        r.dissatisfaction_info || r['会员点击不满意'] || '',
        sessionDate
      )
    }
  })

  insert(rows)
  res.json({ ok: true, imported: rows.length })
})

// POST /api/sessions/summarize - batch summarize
router.post('/summarize', authMiddleware, async (req: AuthRequest, res) => {
  const batchSize = parseInt(req.body.batch_size as string) || 10

  const unsummarized = db.prepare(`
    SELECT s.id FROM sessions s
    LEFT JOIN session_summaries ss ON ss.session_id = s.id
    WHERE ss.id IS NULL
    ORDER BY s.sequence_num ASC
    LIMIT ?
  `).all(batchSize) as any[]

  if (unsummarized.length === 0) {
    return res.json({ processed: 0, remaining: 0, done: true })
  }

  const results = []
  for (const row of unsummarized) {
    try {
      const summary = await summarizeSession(row.id)
      results.push({ id: row.id, summary, ok: true })
    } catch (err: any) {
      results.push({ id: row.id, error: err.message, ok: false })
    }
  }

  const remaining = db.prepare(`
    SELECT COUNT(*) as cnt FROM sessions s
    LEFT JOIN session_summaries ss ON ss.session_id = s.id
    WHERE ss.id IS NULL
  `).get() as any

  res.json({ processed: results.length, remaining: remaining.cnt, done: remaining.cnt === 0, results })
})

// POST /api/sessions/search - semantic search
router.post('/search', authMiddleware, async (req: AuthRequest, res) => {
  const { query, date_from, date_to, threshold, limit } = req.body
  if (!query) return res.status(400).json({ error: 'query required' })

  try {
    const results = await semanticSearch(query, date_from, date_to, threshold || 0.3, limit || 100)
    res.json({ results, total: results.length })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
