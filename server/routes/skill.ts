import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { runSkillAnalysis } from '../services/skillEngine.js'
import path from 'path'

const router = Router()

/**
 * POST /api/skill/analyze
 * 接收用户自然语言问题，调用 Skill 进行分析
 */
router.post('/analyze', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { user_question } = req.body

    if (!user_question) {
      return res.status(400).json({ error: '缺少 user_question 参数' })
    }

    console.log('[Skill API] 收到分析请求:', user_question)

    const result = await runSkillAnalysis({
      userQuestion: user_question,
    })

    res.json({
      success: true,
      report_path: result.reportPath,
      report_url: result.reportUrl,
      summary: result.summary,
    })
  } catch (error: any) {
    console.error('[Skill API] 分析失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '分析失败',
    })
  }
})

/**
 * GET /api/skill/reports/:filename
 * 下载生成的报告文件
 */
router.get('/reports/:filename', (req, res) => {
  const filename = req.params.filename
  const reportsDir = path.join(process.cwd(), 'data', 'reports')
  const filePath = path.join(reportsDir, filename)

  // 安全检查：防止路径遍历攻击
  if (!filePath.startsWith(reportsDir)) {
    return res.status(403).json({ error: '禁止访问' })
  }

  if (!filePath.endsWith('.xlsx')) {
    return res.status(400).json({ error: '只支持 Excel 文件' })
  }

  res.download(filePath, filename)
})

export default router
