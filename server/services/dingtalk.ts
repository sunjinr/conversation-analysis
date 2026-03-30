import db from '../db.js'
import { v4 as uuid } from 'uuid'
import crypto from 'crypto'

/**
 * 发送钉钉通知（分析任务完成时自动调用）
 * @param runId 分析任务 ID
 * @param baseUrl 前端 baseUrl，用于生成报告链接
 */
export async function sendDingTalkNotification(runId: string, baseUrl = 'http://localhost:5173'): Promise<{ ok: boolean; result?: any; error?: string }> {
  const config = db.prepare('SELECT * FROM dingtalk_configs WHERE enabled = 1 LIMIT 1').get() as any
  if (!config) return { ok: false, error: 'DingTalk not configured' }

  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(runId) as any
  if (!run) return { ok: false, error: 'Run not found' }

  const urgentTasks = db.prepare(`
    SELECT title, priority FROM tasks WHERE run_id = ? AND priority IN ('urgent', 'high')
    ORDER BY CASE priority WHEN 'urgent' THEN 0 ELSE 1 END LIMIT 5
  `).all(runId) as any[]

  const markdown = `## 会话分析报告完成
**分析时间**: ${run.completed_at || run.started_at}
**会话数量**: ${run.total_sessions} 条

### 紧急发现
${urgentTasks.length > 0 ? urgentTasks.map(t => `- **[${t.priority}]** ${t.title}`).join('\n') : '无紧急任务'}

[查看详细报告](${baseUrl}/#/analysis/runs/${run.id})`

  let url = config.webhook_url
  if (config.secret) {
    const timestamp = Date.now()
    const sign = crypto.createHmac('sha256', config.secret).update(`${timestamp}\n${config.secret}`).digest('base64')
    url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
  }

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: { title: '会话分析报告', text: markdown },
      }),
    })
    const result = await resp.json()

    db.prepare('INSERT INTO notification_logs (id, channel, run_id, payload_json, status) VALUES (?, ?, ?, ?, ?)')
      .run(uuid(), 'dingtalk', runId, JSON.stringify({ markdown }), 'sent')

    return { ok: true, result }
  } catch (e: any) {
    db.prepare('INSERT INTO notification_logs (id, channel, run_id, payload_json, status) VALUES (?, ?, ?, ?, ?)')
      .run(uuid(), 'dingtalk', runId, JSON.stringify({ error: e.message }), 'failed')
    return { ok: false, error: e.message }
  }
}
