import { Router } from 'express'
import db from '../db.js'
import { v4 as uuid } from 'uuid'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { analyzeSession, generateTasksForRun } from '../services/analyzer.js'

const router = Router()

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM analysis_runs ORDER BY created_at DESC').all()
  res.json(rows)
})

// POST /api/runs - create and start a run
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name, scenario_id, dimension_ids } = req.body
  const configId = uuid()
  db.prepare('INSERT INTO analysis_configs (id, name, scenario_id, dimension_ids, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(configId, name || 'Analysis', scenario_id || null, JSON.stringify(dimension_ids || []), req.user!.id)

  // Get session IDs from scenario
  let sessionIds: string[] = []
  if (scenario_id) {
    const scenario = db.prepare('SELECT matched_session_ids FROM scenarios WHERE id = ?').get(scenario_id) as any
    if (scenario) sessionIds = JSON.parse(scenario.matched_session_ids || '[]')
  }
  if (sessionIds.length === 0) {
    sessionIds = (db.prepare('SELECT id FROM sessions').all() as any[]).map(r => r.id)
  }

  const runId = uuid()
  db.prepare(`INSERT INTO analysis_runs (id, config_id, status, total_sessions, processed_sessions, started_at, triggered_by)
    VALUES (?, ?, 'running', ?, 0, datetime('now'), ?)`).run(runId, configId, sessionIds.length, req.user!.id)

  // Store session list in config for batch processing
  db.prepare('UPDATE analysis_configs SET dimension_ids = ? WHERE id = ?')
    .run(JSON.stringify({ dimension_ids: dimension_ids || [], session_ids: sessionIds }), configId)

  res.json({ id: runId, total_sessions: sessionIds.length })
})

// GET /api/runs/:id
router.get('/:id', (req, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id)
  if (!run) return res.status(404).json({ error: 'Not found' })
  res.json(run)
})

// POST /api/runs/:id/process - process next batch
router.post('/:id/process', authMiddleware, async (req: AuthRequest, res) => {
  const batchSize = parseInt(req.body.batch_size as string) || 5
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id) as any
  if (!run) return res.status(404).json({ error: 'Run not found' })
  if (run.status === 'completed') return res.json({ done: true, processed: run.total_sessions, total: run.total_sessions })

  const config = db.prepare('SELECT * FROM analysis_configs WHERE id = ?').get(run.config_id) as any
  if (!config) return res.status(404).json({ error: 'Config not found' })

  const configData = JSON.parse(config.dimension_ids)
  const dimensionIds: string[] = configData.dimension_ids || []
  const allSessionIds: string[] = configData.session_ids || []

  // Get already processed session IDs for this run
  const processed = db.prepare('SELECT DISTINCT session_id FROM analysis_results WHERE run_id = ?').all(run.id) as any[]
  const processedSet = new Set(processed.map((r: any) => r.session_id))
  const remaining = allSessionIds.filter(id => !processedSet.has(id))

  if (remaining.length === 0) {
    // Complete the run
    db.prepare("UPDATE analysis_runs SET status = 'completed', completed_at = datetime('now'), processed_sessions = ? WHERE id = ?")
      .run(run.total_sessions, run.id)

    // Aggregate summary
    const stats = db.prepare(`SELECT dimension_id, category, COUNT(*) as cnt FROM analysis_results WHERE run_id = ? GROUP BY dimension_id, category`).all(run.id)
    db.prepare('UPDATE analysis_runs SET summary_json = ? WHERE id = ?').run(JSON.stringify(stats), run.id)

    generateTasksForRun(run.id)

    return res.json({ done: true, processed: run.total_sessions, total: run.total_sessions })
  }

  const batch = remaining.slice(0, batchSize)
  const dimensions = dimensionIds.length > 0
    ? dimensionIds.map(id => db.prepare('SELECT * FROM dimensions WHERE id = ?').get(id)).filter(Boolean) as any[]
    : db.prepare('SELECT * FROM dimensions WHERE enabled = 1 ORDER BY sort_order').all() as any[]

  let processedCount = 0
  for (const sessionId of batch) {
    for (const dim of dimensions) {
      // Get feedback for this dimension
      const feedbacks = db.prepare(`
        SELECT cf.original_category, cf.corrected_category, cf.feedback_note
        FROM classification_feedback cf
        JOIN analysis_results ar ON ar.id = cf.result_id
        WHERE ar.dimension_id = ?
        ORDER BY cf.created_at DESC LIMIT 10
      `).all(dim.id) as any[]

      const fbList = feedbacks.map((f: any) => ({
        original: f.original_category,
        corrected: f.corrected_category,
        note: f.feedback_note,
      }))

      try {
        await analyzeSession(sessionId, dim, run.id, fbList)
      } catch (e: any) {
        console.error(`Analysis failed for session ${sessionId}, dim ${dim.id}:`, e.message)
      }
    }
    processedCount++
  }

  const newProcessed = processedSet.size + processedCount
  db.prepare('UPDATE analysis_runs SET processed_sessions = ? WHERE id = ?').run(newProcessed, run.id)

  res.json({ done: false, processed: newProcessed, total: run.total_sessions })
})

// GET /api/runs/:id/report
router.get('/:id/report', (req, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id) as any
  if (!run) return res.status(404).json({ error: 'Not found' })

  const dimensions = db.prepare(`
    SELECT DISTINCT d.id, d.name, d.definition
    FROM analysis_results ar JOIN dimensions d ON d.id = ar.dimension_id
    WHERE ar.run_id = ?
  `).all(run.id) as any[]

  const report: any = { run, dimensions: [] }

  for (const dim of dimensions) {
    const stats = db.prepare(`
      SELECT category, COUNT(*) as count, AVG(confidence) as avg_confidence
      FROM analysis_results WHERE run_id = ? AND dimension_id = ?
      GROUP BY category ORDER BY count DESC
    `).all(run.id, dim.id) as any[]

    const total = stats.reduce((s: number, r: any) => s + r.count, 0)

    report.dimensions.push({
      ...dim,
      stats: stats.map(s => ({ ...s, percentage: total > 0 ? (s.count / total * 100).toFixed(1) : '0' })),
      total,
    })
  }

  res.json(report)
})

// GET /api/runs/:id/results
router.get('/:id/results', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0
  const dimensionId = req.query.dimension_id as string
  const category = req.query.category as string

  let sql = `SELECT ar.*, d.name as dimension_name, s.session_id as original_session_id
    FROM analysis_results ar
    JOIN dimensions d ON d.id = ar.dimension_id
    JOIN sessions s ON s.id = ar.session_id
    WHERE ar.run_id = ?`
  const params: any[] = [req.params.id]

  if (dimensionId) { sql += ' AND ar.dimension_id = ?'; params.push(dimensionId) }
  if (category) { sql += ' AND ar.category = ?'; params.push(category) }
  sql += ' ORDER BY ar.confidence DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const rows = db.prepare(sql).all(...params)
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM analysis_results WHERE run_id = ?`).get(req.params.id) as any

  res.json({ data: rows, total: total.cnt })
})

export default router
