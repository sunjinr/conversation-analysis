import { Router } from 'express'
import db from '../db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { satisfactionSeedData } from '../seed-production.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', '..', 'data')
const seedPath = path.join(dataDir, 'satisfaction-seed.json')
let satisfactionSeed: any[] = []
try {
  if (fs.existsSync(seedPath)) {
    satisfactionSeed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
  }
} catch { /* fallback */ }
// In production, use embedded seed data
if (satisfactionSeed.length === 0 && satisfactionSeedData.length > 0) {
  satisfactionSeed = satisfactionSeedData
}

const router = Router()

router.get('/summary', (req, res) => {
  const totalSessions = db.prepare('SELECT COUNT(*) as cnt FROM sessions').get() as any
  const summarized = db.prepare('SELECT COUNT(*) as cnt FROM session_summaries').get() as any
  const totalRuns = db.prepare('SELECT COUNT(*) as cnt FROM analysis_runs').get() as any
  const openTasks = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status = 'open'").get() as any
  const claimedTasks = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status = 'claimed'").get() as any
  const resolvedTasks = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status = 'resolved'").get() as any
  const latestRun = db.prepare('SELECT * FROM analysis_runs ORDER BY created_at DESC LIMIT 1').get() as any

  // Satisfaction score from dissatisfaction data
  const dissatisfied = db.prepare("SELECT COUNT(*) as cnt FROM sessions WHERE dissatisfaction_info LIKE '%点了不满意%'").get() as any

  res.json({
    total_sessions: totalSessions.cnt,
    summarized_sessions: summarized.cnt,
    total_runs: totalRuns.cnt,
    open_tasks: openTasks.cnt,
    claimed_tasks: claimedTasks.cnt,
    resolved_tasks: resolvedTasks.cnt,
    dissatisfied_sessions: dissatisfied.cnt,
    satisfaction_rate: totalSessions.cnt > 0 ? ((1 - dissatisfied.cnt / totalSessions.cnt) * 100).toFixed(1) : '0',
    latest_run: latestRun,
  })
})

router.get('/satisfaction', (req, res) => {
  // Prefer pre-processed seed data from xlsx
  if (satisfactionSeed.length > 0) {
    return res.json(satisfactionSeed)
  }

  // Fallback: calculate from sessions DB
  const daily = db.prepare(`
    SELECT session_date as date, COUNT(*) as total,
    SUM(CASE WHEN dissatisfaction_info LIKE '%点了不满意%' THEN 1 ELSE 0 END) as dissatisfied
    FROM sessions WHERE session_date != ''
    GROUP BY session_date ORDER BY session_date
  `).all() as any[]

  // Get task resolution events
  const events = db.prepare('SELECT * FROM satisfaction_events ORDER BY event_date').all() as any[]
  const eventMap: Record<string, any> = {}
  for (const e of events) eventMap[e.event_date] = e

  const result = daily.map(d => ({
    date: d.date,
    total: d.total,
    dissatisfied: d.dissatisfied,
    satisfaction_rate: d.total > 0 ? parseFloat(((1 - d.dissatisfied / d.total) * 100).toFixed(1)) : 100,
    tasks_resolved: eventMap[d.date] ? JSON.parse(eventMap[d.date].task_resolved_ids || '[]').length : 0,
    task_notes: eventMap[d.date]?.notes || '',
  }))

  res.json(result)
})

export default router
