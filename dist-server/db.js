import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.NODE_ENV === 'production' ? '/tmp/data' : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir))
    fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'analysis.db');
// Compatibility wrapper to mimic better-sqlite3 API over sql.js
class BetterSqlite3Compat {
    constructor() {
        this.dirty = false;
        this.saveTimer = null;
    }
    async init() {
        const SQL = await initSqlJs();
        if (fs.existsSync(dbPath)) {
            const buf = fs.readFileSync(dbPath);
            this.sqlDb = new SQL.Database(buf);
        }
        else {
            this.sqlDb = new SQL.Database();
        }
        this.sqlDb.run('PRAGMA journal_mode = WAL');
        this.sqlDb.run('PRAGMA foreign_keys = ON');
    }
    save() {
        if (this.saveTimer)
            return;
        this.saveTimer = setTimeout(() => {
            try {
                const data = this.sqlDb.export();
                fs.writeFileSync(dbPath, Buffer.from(data));
            }
            catch { }
            this.saveTimer = null;
        }, 500);
    }
    exec(sql) {
        this.sqlDb.run(sql);
        this.save();
    }
    pragma(str) {
        this.sqlDb.run(`PRAGMA ${str}`);
    }
    prepare(sql) {
        const db = this.sqlDb;
        const self = this;
        return {
            run(...params) {
                db.run(sql, params);
                self.save();
                return { changes: db.getRowsModified() };
            },
            get(...params) {
                const stmt = db.prepare(sql);
                if (params.length > 0)
                    stmt.bind(params);
                if (stmt.step()) {
                    const cols = stmt.getColumnNames();
                    const vals = stmt.get();
                    stmt.free();
                    const row = {};
                    cols.forEach((c, i) => { row[c] = vals[i]; });
                    return row;
                }
                stmt.free();
                return undefined;
            },
            all(...params) {
                const stmt = db.prepare(sql);
                if (params.length > 0)
                    stmt.bind(params);
                const rows = [];
                while (stmt.step()) {
                    const cols = stmt.getColumnNames();
                    const vals = stmt.get();
                    const row = {};
                    cols.forEach((c, i) => { row[c] = vals[i]; });
                    rows.push(row);
                }
                stmt.free();
                return rows;
            },
        };
    }
    transaction(fn) {
        const self = this;
        return ((...args) => {
            self.sqlDb.run('BEGIN');
            try {
                fn(...args);
                self.sqlDb.run('COMMIT');
                self.save();
            }
            catch (e) {
                self.sqlDb.run('ROLLBACK');
                throw e;
            }
        });
    }
}
const db = new BetterSqlite3Compat();
export async function initDB() {
    await db.init();
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      role TEXT DEFAULT 'member',
      token TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
    db.exec(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, sequence_num INTEGER, session_id TEXT, user_id TEXT,
      ocs_session_id TEXT, bot_conversation TEXT, human_conversation TEXT,
      dissatisfaction_info TEXT, session_date TEXT, imported_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS session_summaries (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, summary_text TEXT NOT NULL,
      embedding TEXT, key_topics TEXT DEFAULT '[]', generated_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
      date_from TEXT, date_to TEXT, matched_session_ids TEXT DEFAULT '[]',
      matched_count INTEGER DEFAULT 0, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS dimensions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, definition TEXT NOT NULL,
      categories_json TEXT DEFAULT '[]', auto_discover INTEGER DEFAULT 0,
      sub_skill_ref TEXT DEFAULT '', sort_order INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS analysis_configs (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, scenario_id TEXT,
      frequency TEXT DEFAULT 'manual', dimension_ids TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS analysis_runs (
      id TEXT PRIMARY KEY, config_id TEXT, status TEXT DEFAULT 'pending',
      total_sessions INTEGER DEFAULT 0, processed_sessions INTEGER DEFAULT 0,
      started_at TEXT, completed_at TEXT, error_message TEXT DEFAULT '',
      summary_json TEXT DEFAULT '{}', triggered_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL, session_id TEXT NOT NULL,
      dimension_id TEXT NOT NULL, category TEXT NOT NULL, confidence REAL DEFAULT 0,
      reasoning TEXT DEFAULT '', is_auto_discovered INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, run_id TEXT, dimension_id TEXT, title TEXT NOT NULL,
      description TEXT NOT NULL, priority TEXT DEFAULT 'medium', status TEXT DEFAULT 'open',
      assignee_id TEXT, resolution_text TEXT DEFAULT '', resolved_at TEXT,
      related_session_ids TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, role_description TEXT NOT NULL,
      email TEXT DEFAULT '', user_id TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS classification_feedback (
      id TEXT PRIMARY KEY, result_id TEXT NOT NULL, original_category TEXT NOT NULL,
      corrected_category TEXT, feedback_note TEXT DEFAULT '', submitted_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS dingtalk_configs (
      id TEXT PRIMARY KEY, webhook_url TEXT NOT NULL, secret TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY, channel TEXT DEFAULT 'dingtalk', run_id TEXT,
      payload_json TEXT NOT NULL, status TEXT DEFAULT 'sent', sent_at TEXT DEFAULT (datetime('now'))
  )`);
    db.exec(`CREATE TABLE IF NOT EXISTS satisfaction_events (
      id TEXT PRIMARY KEY, event_date TEXT NOT NULL, satisfaction_score REAL,
      total_sessions INTEGER DEFAULT 0, dissatisfied_count INTEGER DEFAULT 0,
      task_resolved_ids TEXT DEFAULT '[]', notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
  )`);
    // Seed admin
    const adminExists = db.prepare('SELECT id FROM users WHERE id = ?').get('admin-001');
    if (!adminExists) {
        db.prepare('INSERT INTO users (id, name, email, role, token) VALUES (?, ?, ?, ?, ?)').run('admin-001', 'Admin', 'admin@example.com', 'admin', 'admin123');
    }
    // Seed dimensions
    const dimCount = db.prepare('SELECT COUNT(*) as cnt FROM dimensions').get();
    if (dimCount.cnt === 0) {
        const dims = [
            { id: 'dim-transfer-reason', name: '转人工原因分类', definition: '分析买家从AI客服转到人工客服的根本原因。需要对比AI客服对话和人工客服对话的内容，判断转人工的核心动因。',
                categories: [
                    { name: '人工帮助执行操作', description: 'AI只能提供通用流程说明，买家需要人工查询/操作具体订单、账户等' },
                    { name: 'AI回答错误或无法回答', description: 'AI给出了错误答案或兜底回复，人工客服给出了正确方案' },
                    { name: '买家更信任人工', description: 'AI和人工给出相似答案，但买家不信任AI或需要人工确认' },
                    { name: '人工也需升级', description: '问题较复杂，人工也需要提交工单或升级至专业团队' },
                    { name: '人工更有人情味', description: 'AI和人工回答内容相近，但人工在措辞上更有温度和共情' },
                    { name: '转人工后问了不同问题', description: '买家在AI处和人工处讨论了不同的问题' },
                    { name: '其他', description: '无法归入以上类别' },
                ], sort_order: 0 },
            { id: 'dim-topic', name: '买家问题类型', definition: '识别买家咨询的具体问题类型，用于了解客户需求分布。',
                categories: [
                    { name: '退款申请/进度', description: '退款相关咨询' }, { name: '纠纷/Dispute处理', description: '纠纷争议相关' },
                    { name: '订单物流追踪', description: '物流跟踪查询' }, { name: 'VAT/税务相关', description: '税务、发票、关税' },
                    { name: '支付方式/付款问题', description: '支付方式相关' }, { name: '退货/商品问题', description: '退货、质量问题' },
                    { name: '账户/登录', description: '账户问题' }, { name: '供应商/商品咨询', description: '供应商询盘' },
                    { name: '其他咨询', description: '其他类型' },
                ], sort_order: 1 },
            { id: 'dim-dissatisfaction', name: '不满意原因分析', definition: '分析买家点击不满意的具体原因和时间节点，结合对话上下文判断不满意的根因。',
                categories: [
                    { name: 'AI回答无用/错误', description: 'AI给出的答案与买家问题不匹配或完全错误' },
                    { name: '回答复杂难懂', description: 'AI回答过于复杂或措辞让人难以理解' },
                    { name: '未回答我的问题', description: 'AI没有针对性回答买家的具体问题' },
                    { name: '不同意平台政策', description: '买家对平台的退款/退货等政策不满' },
                    { name: '界面难用', description: '聊天界面或交互体验差' },
                    { name: '文字太多', description: 'AI回复过长不想阅读' },
                    { name: '其他', description: '无法归类' },
                ], sort_order: 2 },
        ];
        for (const d of dims) {
            db.prepare('INSERT INTO dimensions (id, name, definition, categories_json, auto_discover, sub_skill_ref, sort_order, enabled, created_by) VALUES (?, ?, ?, ?, 1, \'\', ?, 1, \'admin-001\')').run(d.id, d.name, d.definition, JSON.stringify(d.categories), d.sort_order);
        }
    }
    console.log('[DB] Initialized successfully');
}
export default db;
