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

  // 解析 summary_json 获取概述信息
  let summary: any = {}
  try {
    summary = JSON.parse(run.summary_json || '{}')
  } catch {}

  // 构建分析数据摘要
  const statsLines: string[] = []
  if (summary.topicLabel) {
    statsLines.push(`**分析主题**：${summary.topicLabel}`)
  }
  if (summary.totalSessions) {
    statsLines.push(`**数据总量**：${summary.totalSessions} 条会话`)
  }
  if (summary.keywordFiltered) {
    statsLines.push(`**关键词匹配**：${summary.keywordFiltered} 条`)
  }
  if (summary.analyzed) {
    statsLines.push(`**最终分析**：${summary.analyzed} 条`)
  }

  // 概述文本
  let overviewText = ''
  if (summary.overview) {
    overviewText = summary.overview.length > 200 ? summary.overview.substring(0, 200) + '...' : summary.overview
  }

  const markdown = `## ${run.name || '洞察完成'}

${statsLines.length > 0 ? statsLines.join('\n\n') + '\n' : ''}
${overviewText ? `> ${overviewText}\n` : ''}
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
        markdown: { title: run.name || '洞察完成', text: markdown },
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
