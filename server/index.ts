import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB } from './db.js'
import { seedProductionDataIfNeeded } from './seed-data.js'
import authRouter from './routes/auth.js'
import sessionsRouter from './routes/sessions.js'
import scenariosRouter from './routes/scenarios.js'
import dimensionsRouter from './routes/dimensions.js'
import runsRouter from './routes/runs.js'
import tasksRouter from './routes/tasks.js'
import teamRouter from './routes/team.js'
import settingsRouter from './routes/settings.js'
import dashboardRouter from './routes/dashboard.js'
import notifyRouter from './routes/notify.js'
import metricsRouter from './routes/metrics.js'
import skillRouter from './routes/skill.js'
import feedbackRouter from './routes/feedback.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// API routes
app.use('/api/auth', authRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/scenarios', scenariosRouter)
app.use('/api/dimensions', dimensionsRouter)
app.use('/api/runs', runsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/team', teamRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/notify', notifyRouter)
app.use('/api/metrics', metricsRouter)
app.use('/api/skill', skillRouter)
app.use('/api/feedback', feedbackRouter)

// Production: serve Vite build output
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const PORT = parseInt(process.env.PORT || '3001')

initDB().then(() => {
  // Auto-seed data in production if database is empty
  if (process.env.NODE_ENV === 'production') {
    seedProductionDataIfNeeded()
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`)
  })
}).catch(e => {
  console.error('[DB] Init failed:', e)
  process.exit(1)
})
