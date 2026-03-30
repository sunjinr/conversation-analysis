import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { sendDingTalkNotification } from '../services/dingtalk.js'

const router = Router()

router.post('/dingtalk', authMiddleware, async (req: AuthRequest, res) => {
  const { run_id } = req.body
  const baseUrl = req.headers.origin || 'http://localhost:5173'
  const result = await sendDingTalkNotification(run_id, baseUrl)

  if (result.ok) {
    res.json(result)
  } else {
    res.status(result.error === 'Run not found' ? 404 : 400).json({ error: result.error })
  }
})

export default router
