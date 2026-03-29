import { chatComplete, isEmbeddingAvailable, getEmbedding } from './openai.js'
import db from '../db.js'
import { v4 as uuid } from 'uuid'

export async function summarizeSession(sessionId: string): Promise<string> {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any
  if (!session) throw new Error('Session not found')

  const prompt = `你是一个客服对话分析专家。请用JSON格式返回以下内容，不要输出其他文字：
{
  "summary": "2-3句中文总结（包含买家核心问题、AI客服回应、人工客服处理、最终结果）",
  "keywords": ["关键词1", "关键词2", ...],
  "topic": "主题分类（如：退款、物流、纠纷、支付、账户、退货、税务等）"
}

关键词要求：提取5-10个关键词，涵盖问题类型、商品类型、买家情绪、处理结果等维度，便于后续检索匹配。`

  let content = ''
  if (session.bot_conversation) {
    content += `=== AI客服对话 ===\n${session.bot_conversation.slice(0, 3000)}\n\n`
  }
  if (session.human_conversation) {
    content += `=== 人工客服对话 ===\n${session.human_conversation.slice(0, 3000)}\n\n`
  }
  if (session.dissatisfaction_info) {
    content += `=== 不满意信息 ===\n${session.dissatisfaction_info}\n`
  }

  const raw = await chatComplete(prompt, content)

  // Parse JSON from LLM response (handle markdown code blocks)
  let summary = raw
  let keywords = ''
  let topic = ''
  try {
    const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    summary = parsed.summary || raw
    keywords = Array.isArray(parsed.keywords) ? parsed.keywords.join(',') : ''
    topic = parsed.topic || ''
  } catch {
    summary = raw.slice(0, 500)
  }

  const keyTopics = [topic, keywords].filter(Boolean).join(',')

  // Try to generate embedding if available
  let embedding: string | null = null
  if (isEmbeddingAvailable()) {
    try {
      const vec = await getEmbedding(summary + ' ' + keyTopics)
      embedding = JSON.stringify(vec)
    } catch (e: any) {
      console.warn(`[Embedding] Failed for ${sessionId}:`, e.message)
    }
  }

  const existing = db.prepare('SELECT id FROM session_summaries WHERE session_id = ?').get(sessionId) as any
  if (existing) {
    db.prepare('UPDATE session_summaries SET summary_text = ?, key_topics = ?, embedding = ?, generated_at = datetime(\'now\') WHERE session_id = ?')
      .run(summary, keyTopics, embedding, sessionId)
  } else {
    db.prepare('INSERT INTO session_summaries (id, session_id, summary_text, key_topics, embedding, generated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))')
      .run(uuid(), sessionId, summary, keyTopics, embedding)
  }

  return summary
}
