import { chatComplete } from './openai.js';
import db from '../db.js';
import { v4 as uuid } from 'uuid';
export async function analyzeSession(sessionId, dimension, runId, feedbackList = []) {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!session)
        throw new Error('Session not found');
    const categories = JSON.parse(dimension.categories_json);
    const catList = categories.map((c, i) => `${i + 1}. ${c.name}: ${c.description}`).join('\n');
    let systemPrompt = `你是一个客服对话分析专家。你需要根据以下分析维度对会话进行分类。

## 分析维度: ${dimension.name}
## 定义: ${dimension.definition}

## 可选类别:
${catList}
`;
    if (dimension.auto_discover) {
        systemPrompt += `\n如果现有类别都不合适，你可以建议一个新类别（在category中返回新类别名称，并设is_auto_discovered为true）。\n`;
    }
    if (feedbackList.length > 0) {
        systemPrompt += `\n## 历史纠正参考（之前的分类被用户修正过）:\n`;
        for (const fb of feedbackList.slice(0, 10)) {
            systemPrompt += `- 原分类"${fb.original}"被修正为"${fb.corrected}"${fb.note ? ` (原因: ${fb.note})` : ''}\n`;
        }
    }
    systemPrompt += `\n请严格返回JSON格式（不要包含其他文字）:
{"category": "类别名称", "confidence": 0.0到1.0, "reasoning": "分类理由（简洁）", "is_auto_discovered": false}`;
    let userContent = '';
    if (session.bot_conversation) {
        userContent += `=== AI客服对话 ===\n${session.bot_conversation.slice(0, 4000)}\n\n`;
    }
    if (session.human_conversation) {
        userContent += `=== 人工客服对话 ===\n${session.human_conversation.slice(0, 4000)}\n\n`;
    }
    if (session.dissatisfaction_info) {
        userContent += `=== 不满意信息 ===\n${session.dissatisfaction_info}\n`;
    }
    const raw = await chatComplete(systemPrompt, userContent);
    let parsed;
    try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { category: '其他', confidence: 0, reasoning: raw };
    }
    catch {
        parsed = { category: '其他', confidence: 0, reasoning: raw, is_auto_discovered: false };
    }
    const result = {
        category: parsed.category || '其他',
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || '',
        isAutoDiscovered: !!parsed.is_auto_discovered,
    };
    db.prepare(`INSERT INTO analysis_results (id, run_id, session_id, dimension_id, category, confidence, reasoning, is_auto_discovered)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(uuid(), runId, sessionId, dimension.id, result.category, result.confidence, result.reasoning, result.isAutoDiscovered ? 1 : 0);
    return result;
}
export function generateTasksForRun(runId) {
    const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(runId);
    if (!run)
        return;
    const dimensions = db.prepare('SELECT DISTINCT dimension_id FROM analysis_results WHERE run_id = ?').all(runId);
    for (const { dimension_id } of dimensions) {
        const dim = db.prepare('SELECT * FROM dimensions WHERE id = ?').get(dimension_id);
        if (!dim)
            continue;
        const categoryCounts = db.prepare(`
      SELECT category, COUNT(*) as cnt, GROUP_CONCAT(session_id) as session_ids
      FROM analysis_results WHERE run_id = ? AND dimension_id = ?
      GROUP BY category ORDER BY cnt DESC
    `).all(runId, dimension_id);
        for (const cat of categoryCounts) {
            if (cat.cnt < 3)
                continue;
            const sessionIds = cat.session_ids.split(',').slice(0, 20);
            const priority = cat.cnt >= 50 ? 'urgent' : cat.cnt >= 20 ? 'high' : cat.cnt >= 10 ? 'medium' : 'low';
            // Auto-assign based on team member role
            let assigneeId = null;
            const members = db.prepare('SELECT * FROM team_members').all();
            if (members.length > 0) {
                const catLower = (cat.category + ' ' + dim.name).toLowerCase();
                for (const m of members) {
                    const roleWords = m.role_description.toLowerCase().split(/\s+/);
                    if (roleWords.some((w) => catLower.includes(w) && w.length > 2)) {
                        assigneeId = m.id;
                        break;
                    }
                }
                if (!assigneeId)
                    assigneeId = members[0].id;
            }
            db.prepare(`INSERT INTO tasks (id, run_id, dimension_id, title, description, priority, status, assignee_id, related_session_ids)
        VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`).run(uuid(), runId, dimension_id, `[${dim.name}] ${cat.category} (${cat.cnt}条)`, `在"${dim.name}"维度下，共有${cat.cnt}条会话被分类为"${cat.category}"。需要检查相关会话并制定改进方案。`, priority, assigneeId, JSON.stringify(sessionIds));
        }
    }
}
