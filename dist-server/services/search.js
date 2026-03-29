import { chatComplete, isEmbeddingAvailable, getEmbedding, cosineSimilarity } from './openai.js';
import db from '../db.js';
export async function semanticSearch(query, dateFrom, dateTo, threshold = 0.3, limit = 100) {
    let sql = `
    SELECT ss.session_id, ss.summary_text, ss.key_topics, ss.embedding,
           s.session_date, s.bot_conversation, s.human_conversation
    FROM session_summaries ss
    JOIN sessions s ON s.id = ss.session_id
    WHERE 1=1
  `;
    const params = [];
    if (dateFrom) {
        sql += ' AND s.session_date >= ?';
        params.push(dateFrom);
    }
    if (dateTo) {
        sql += ' AND s.session_date <= ?';
        params.push(dateTo);
    }
    const rows = db.prepare(sql).all(...params);
    // If embedding API available and data has embeddings, use vector search
    const hasEmbeddings = isEmbeddingAvailable() && rows.some(r => r.embedding);
    if (hasEmbeddings) {
        const queryVec = await getEmbedding(query);
        return rows
            .filter(r => r.embedding)
            .map(row => {
            const emb = JSON.parse(row.embedding);
            const sim = cosineSimilarity(queryVec, emb);
            return { sessionId: row.session_id, similarity: Math.round(sim * 100) / 100, summary: row.summary_text || '' };
        })
            .filter(r => r.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    // Fallback: LLM keyword expansion + text matching
    let searchTerms = [query];
    try {
        const raw = await chatComplete('你是搜索关键词扩展专家。将用户搜索意图扩展为关键词JSON数组，覆盖中英文同义词，5-15个。只返回JSON数组，不要其他文字。', query);
        const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed))
            searchTerms = [query, ...parsed];
    }
    catch {
        searchTerms = query.split(/[\s,，、]+/).filter(Boolean);
    }
    const lowerTerms = searchTerms.map(t => t.toLowerCase());
    return rows
        .map(row => {
        const text = [
            row.summary_text || '',
            row.key_topics || '',
            (row.bot_conversation || '').slice(0, 1000),
            (row.human_conversation || '').slice(0, 1000),
        ].join(' ').toLowerCase();
        let matchCount = 0;
        for (const term of lowerTerms) {
            if (term && text.includes(term))
                matchCount++;
        }
        const similarity = lowerTerms.length > 0 ? matchCount / lowerTerms.length : 0;
        return { sessionId: row.session_id, similarity: Math.round(similarity * 100) / 100, summary: row.summary_text || '' };
    })
        .filter(r => r.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
}
