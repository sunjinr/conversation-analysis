import { chatComplete, isEmbeddingAvailable, getEmbedding, cosineSimilarity } from './openai.js'
import db from '../db.js'

export async function semanticSearch(
  query: string,
  dateFrom?: string,
  dateTo?: string,
  threshold = 0.3,
  limit = 100
): Promise<{ sessionId: string; similarity: number; summary: string }[]> {
  let sql = `
    SELECT ss.session_id, ss.summary_text, ss.key_topics, ss.embedding,
           s.session_date, s.bot_conversation, s.human_conversation, s.dissatisfaction_info
    FROM session_summaries ss
    JOIN sessions s ON s.id = ss.session_id
    WHERE 1=1
  `
  const params: string[] = []
  if (dateFrom) { sql += ' AND s.session_date >= ?'; params.push(dateFrom) }
  if (dateTo) { sql += ' AND s.session_date <= ?'; params.push(dateTo) }

  const rows = db.prepare(sql).all(...params) as any[]

  // If embedding API available and data has embeddings, use vector search
  const hasEmbeddings = isEmbeddingAvailable() && rows.some(r => r.embedding)
  if (hasEmbeddings) {
    const queryVec = await getEmbedding(query)
    return rows
      .filter(r => r.embedding)
      .map(row => {
        const emb = JSON.parse(row.embedding)
        const sim = cosineSimilarity(queryVec, emb)
        return { sessionId: row.session_id, similarity: Math.round(sim * 100) / 100, summary: row.summary_text || '' }
      })
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  // Fallback: LLM keyword expansion + text matching
  let expandedTerms: string[] = []
  try {
    const raw = await chatComplete(
      '你是搜索关键词扩展专家。将用户搜索意图扩展为关键词JSON数组，覆盖中英文同义词，5-15个。只返回JSON数组，不要其他文字。',
      query
    )
    const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) expandedTerms = parsed.map((t: string) => t.toLowerCase())
  } catch {
    // ignore expansion failure
  }

  // Split original query into core terms (2+ chars)
  const coreTerms = query.split(/[\s,，、。；;：:!！?？]+/).filter(t => t.length >= 2).map(t => t.toLowerCase())

  return rows
    .map(row => {
      const text = [
        row.summary_text || '',
        row.key_topics || '',
        row.dissatisfaction_info || '',
        (row.bot_conversation || '').slice(0, 1000),
        (row.human_conversation || '').slice(0, 1000),
      ].join(' ').toLowerCase()

      // Core terms: each match gives 0.25 score (high weight)
      let score = 0
      for (const term of coreTerms) {
        if (term && text.includes(term)) score += 0.25
      }
      // Expanded terms: each match gives 0.08 score (lower weight)
      for (const term of expandedTerms) {
        if (term && text.includes(term)) score += 0.08
      }
      const similarity = Math.min(Math.round(score * 100) / 100, 1.0)
      return { sessionId: row.session_id, similarity, summary: row.summary_text || '' }
    })
    .filter(r => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}
