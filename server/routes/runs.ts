import { Router } from 'express'
import db from '../db.js'
import { v4 as uuid } from 'uuid'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { generateTasksForRun } from '../services/analyzer.js'
import { runSkillAnalysis } from '../services/skillEngine.js'
import { sendDingTalkNotification } from '../services/dingtalk.js'
import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const router = Router()

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM analysis_runs ORDER BY created_at DESC').all()
  res.json(rows)
})

// POST /api/runs/import - import analysis run data directly (no re-analysis)
router.post('/import', authMiddleware, (req: AuthRequest, res) => {
  const { id, name, user_question, total_sessions, processed_sessions, summary_json, excel_report_base64, view_type, detail_data, created_at, completed_at } = req.body
  if (!id || !name) return res.status(400).json({ error: 'id and name required' })

  // Check if already exists
  const existing = db.prepare('SELECT id FROM analysis_runs WHERE id = ?').get(id)
  if (existing) {
    return res.json({ ok: true, message: 'already exists', id })
  }

  const configId = uuid()
  db.prepare('INSERT INTO analysis_configs (id, name, scenario_id, dimension_ids, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(configId, name, null, '[]', req.user!.id)

  // Save Excel report if provided
  let excelPath = ''
  if (excel_report_base64) {
    const OUTPUT_DIR = process.env.NODE_ENV === 'production' ? '/tmp/data/reports' : path.join(process.cwd(), 'data', 'reports')
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }
    const fileName = `${name.replace(/[\/\\]/g, '_')}_${id.slice(0, 8)}.xlsx`
    excelPath = path.join(OUTPUT_DIR, fileName)
    const buffer = Buffer.from(excel_report_base64, 'base64')
    fs.writeFileSync(excelPath, buffer)
  }

  // For dashboard view type, ensure summary_json contains all necessary data
  let finalSummaryJson = summary_json || '{}'
  
  // If summary_json is already a string (from seed file), parse it first
  let summary: any = {}
  if (typeof summary_json === 'string') {
    try {
      summary = JSON.parse(summary_json)
    } catch {
      summary = {}
    }
  } else if (typeof summary_json === 'object') {
    summary = summary_json
  }
  
  // For dashboard views, ensure viewType is set and detailData is present
  if (view_type === 'dashboard') {
    summary.viewType = 'dashboard'
    // If detail_data is provided separately, merge it
    if (detail_data && !summary.detailData) {
      summary.detailData = detail_data
    }
    finalSummaryJson = JSON.stringify(summary)
  }

  db.prepare(`INSERT INTO analysis_runs (id, config_id, name, user_question, status, total_sessions, processed_sessions, 
    started_at, completed_at, summary_json, excel_report_path, created_at, triggered_by)
    VALUES (?, ?, ?, ?, 'completed', ?, ?, datetime('now'), ?, ?, ?, ?, ?)`).run(
    id, configId, name, user_question || '', 
    total_sessions || 0, processed_sessions || 0,
    completed_at || new Date().toISOString().slice(0, 19),
    finalSummaryJson,
    excelPath,
    created_at || new Date().toISOString().slice(0, 19),
    req.user!.id
  )

  res.json({ ok: true, id })
})

// POST /api/runs - create and start a run
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name, scenario_id, dimension_ids, user_question, date_from, date_to } = req.body
  const configId = uuid()
  db.prepare('INSERT INTO analysis_configs (id, name, scenario_id, dimension_ids, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(configId, name || 'Analysis', scenario_id || null, JSON.stringify(dimension_ids || []), req.user!.id)

  // Get session IDs from scenario (not used for Python pipeline, but kept for compatibility)
  let sessionIds: string[] = []
  if (scenario_id) {
    const scenario = db.prepare('SELECT matched_session_ids FROM scenarios WHERE id = ?').get(scenario_id) as any
    if (scenario) sessionIds = JSON.parse(scenario.matched_session_ids || '[]')
  }
  if (sessionIds.length === 0) {
    sessionIds = (db.prepare('SELECT id FROM sessions').all() as any[]).map(r => r.id)
  }

  // Python 管道从 Excel 读取数据，数据池数量由 Python 分析结果决定
  const TOTAL_DATA_POOL = sessionIds.length

  const runId = uuid()
  const runName = name || `洞察 ${new Date().toLocaleDateString('zh-CN')}`
  db.prepare(`INSERT INTO analysis_runs (id, config_id, name, user_question, status, total_sessions, processed_sessions, started_at, triggered_by)
    VALUES (?, ?, ?, ?, 'running', ?, 0, datetime('now'), ?)`).run(runId, configId, runName, user_question || '', TOTAL_DATA_POOL, req.user!.id)

  // Store session list in config for batch processing
  db.prepare('UPDATE analysis_configs SET dimension_ids = ? WHERE id = ?')
    .run(JSON.stringify({ dimension_ids: dimension_ids || [], session_ids: sessionIds }), configId)

  // Auto-start processing in background using Python skill pipeline
  const autoProcess = async () => {
    try {
      // 构建用户问题：如果用户提供了自由场景问题，直接使用；否则使用默认描述
      const userQuestion = user_question || `分析这些会话数据，按照选定的维度进行分类统计`

      // 获取选中的维度定义，构建 custom_dimensions
      const dims = (dimension_ids && dimension_ids.length > 0)
        ? dimension_ids.map((did: string) => db.prepare('SELECT * FROM dimensions WHERE id = ?').get(did)).filter(Boolean) as any[]
        : db.prepare('SELECT * FROM dimensions WHERE enabled = 1 ORDER BY sort_order').all() as any[]

      const customDimensions: Record<string, { definition: string; suggestion: string }> = {}
      for (const dim of dims) {
        const categories = JSON.parse(dim.categories_json || '[]') as Array<{ name: string; description: string }>
        customDimensions[dim.name] = {
          definition: dim.definition || '',
          suggestion: categories.map(c => `${c.name}: ${c.description}`).join('; '),
        }
      }

      // 从 SQLite 读取会话数据并转换为 Python 格式
      const rawSessions = db.prepare('SELECT * FROM sessions').all() as any[]
      const sessionsData = rawSessions.map(s => ({
        session_id: s.session_id,
        user_id: s.user_id,
        ocs_session_id: s.ocs_session_id,
        bot_messages: (s.bot_conversation || '').split('\n').filter(Boolean),
        human_messages: (s.human_conversation || '').split('\n').filter(Boolean),
        unsatisfied: !!s.dissatisfaction_info,
        dissatisfaction_info: s.dissatisfaction_info || '',
        session_date: s.session_date,
      }))

      // 调用 Python skill 分析
      const result = await runSkillAnalysis({
        userQuestion,
        customDimensions,
        dateFrom: date_from || undefined,
        dateTo: date_to || undefined,
        sessionsData,
      })

      // 更新运行状态，使用 Python 实际处理的会话数
      const totalFromPython = result.summary.totalSessions || sessionIds.length
      db.prepare("UPDATE analysis_runs SET status = 'completed', completed_at = datetime('now'), total_sessions = ?, processed_sessions = ?, summary_json = ?, excel_report_path = ? WHERE id = ?")
        .run(totalFromPython, result.summary.analyzed || totalFromPython, JSON.stringify(result.summary), result.reportPath, runId)

      // 生成任务
      await generateTasksForRun(runId)

      // 钉钉通知
      sendDingTalkNotification(runId).catch(e => console.error('DingTalk notification failed:', e))
    } catch (error: any) {
      console.error('Auto process failed:', error)
      db.prepare("UPDATE analysis_runs SET status = 'failed', completed_at = datetime('now') WHERE id = ?").run(runId)
    }
  }
  autoProcess().catch(e => console.error('Auto process failed:', e))

  res.json({ id: runId, total_sessions: TOTAL_DATA_POOL })
})

// GET /api/runs/:id/dashboard-data - get dashboard chart data for dashboard-type insights
// MUST be before /:id route to avoid Express route matching issues
router.get('/:id/dashboard-data', (req, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id) as any
  if (!run) return res.status(404).json({ error: 'Not found' })

  try {
    const summary = JSON.parse(run.summary_json || '{}')
    if (summary.viewType !== 'dashboard') {
      return res.status(400).json({ error: 'This insight does not have dashboard view' })
    }

    res.json({
      resolutionStatus: summary.resolutionStatus || {},
      unresolvedReasons: summary.unresolvedReasons || [],
      highFrequencyIssues: summary.highFrequencyIssues || [],
      detailData: summary.detailData || [],
    })
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to parse dashboard data', message: e.message })
  }
})

// GET /api/runs/:id
router.get('/:id', (req, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id)
  if (!run) return res.status(404).json({ error: 'Not found' })
  res.json(run)
})

// DELETE /api/runs/:id
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id) as any
  if (!run) return res.status(404).json({ error: 'Not found' })
  if (run.status === 'running') return res.status(400).json({ error: 'Cannot delete a running task' })

  // Delete related data
  db.prepare('DELETE FROM analysis_results WHERE run_id = ?').run(req.params.id)
  db.prepare('DELETE FROM classification_feedback WHERE run_id = ?').run(req.params.id)
  db.prepare('DELETE FROM tasks WHERE run_id = ?').run(req.params.id)
  db.prepare('DELETE FROM analysis_runs WHERE id = ?').run(req.params.id)

  // Delete Excel file if exists
  if (run.excel_report_path && fs.existsSync(run.excel_report_path)) {
    try { fs.unlinkSync(run.excel_report_path) } catch {}
  }

  res.json({ ok: true })
})

// POST /api/runs/:id/process - process using Python skill pipeline
router.post('/:id/process', authMiddleware, async (req: AuthRequest, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id) as any
  if (!run) return res.status(404).json({ error: 'Run not found' })
  if (run.status === 'completed') return res.json({ done: true, processed: run.total_sessions, total: run.total_sessions })
  if (run.status === 'running' || run.status === 'pending') {
    return res.json({ done: false, processed: run.processed_sessions || 0, total: run.total_sessions, message: 'Processing in background' })
  }

  // Start background processing
  const autoProcess = async () => {
    try {
      const config = db.prepare('SELECT * FROM analysis_configs WHERE id = ?').get(run.config_id) as any
      if (!config) throw new Error('Config not found')

      const configData = JSON.parse(config.dimension_ids)
      const dimensionIds: string[] = configData.dimension_ids || []

      const dims = dimensionIds.length > 0
        ? dimensionIds.map((did: string) => db.prepare('SELECT * FROM dimensions WHERE id = ?').get(did)).filter(Boolean) as any[]
        : db.prepare('SELECT * FROM dimensions WHERE enabled = 1 ORDER BY sort_order').all() as any[]

      const customDimensions: Record<string, { definition: string; suggestion: string }> = {}
      for (const dim of dims) {
        const categories = JSON.parse(dim.categories_json || '[]') as Array<{ name: string; description: string }>
        customDimensions[dim.name] = {
          definition: dim.definition || '',
          suggestion: categories.map(c => `${c.name}: ${c.description}`).join('; '),
        }
      }

      const userQuestion = run.user_question || `分析这些会话数据，按照选定的维度进行分类统计`

      // 更新状态为 running
      db.prepare("UPDATE analysis_runs SET status = 'running' WHERE id = ?").run(run.id)

      const result = await runSkillAnalysis({
        userQuestion,
        customDimensions,
      })

      db.prepare("UPDATE analysis_runs SET status = 'completed', completed_at = datetime('now'), processed_sessions = ?, summary_json = ? WHERE id = ?")
        .run(result.summary.analyzed || result.summary.totalSessions, JSON.stringify(result.summary), run.id)

      await generateTasksForRun(run.id)

      const baseUrl = (req.headers.origin as string) || 'http://localhost:5173'
      sendDingTalkNotification(run.id, baseUrl).catch(e => console.error('DingTalk notification failed:', e))
    } catch (error: any) {
      console.error('Process failed:', error)
      db.prepare("UPDATE analysis_runs SET status = 'failed', completed_at = datetime('now') WHERE id = ?").run(run.id)
    }
  }
  autoProcess().catch(e => console.error('Auto process failed:', e))

  res.json({ done: false, processed: run.processed_sessions || 0, total: run.total_sessions, message: 'Started background processing' })
})

// GET /api/runs/:id/report
router.get('/:id/report', (req, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id) as any
  if (!run) return res.status(404).json({ error: 'Not found' })

  const dimensions = db.prepare(`
    SELECT DISTINCT d.id, d.name, d.definition
    FROM analysis_results ar JOIN dimensions d ON d.id = ar.dimension_id
    WHERE ar.run_id = ?
  `).all(run.id) as any[]

  const report: any = { run, dimensions: [] }

  for (const dim of dimensions) {
    const stats = db.prepare(`
      SELECT category, COUNT(*) as count, AVG(confidence) as avg_confidence
      FROM analysis_results WHERE run_id = ? AND dimension_id = ?
      GROUP BY category ORDER BY count DESC
    `).all(run.id, dim.id) as any[]

    const total = stats.reduce((s: number, r: any) => s + r.count, 0)

    report.dimensions.push({
      ...dim,
      stats: stats.map(s => ({ ...s, percentage: total > 0 ? (s.count / total * 100).toFixed(1) : '0' })),
      total,
    })
  }

  res.json(report)
})

// GET /api/runs/:id/results
router.get('/:id/results', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0
  const dimensionId = req.query.dimension_id as string
  const category = req.query.category as string

  let sql = `SELECT ar.*, d.name as dimension_name, s.session_id as original_session_id
    FROM analysis_results ar
    JOIN dimensions d ON d.id = ar.dimension_id
    JOIN sessions s ON s.id = ar.session_id
    WHERE ar.run_id = ?`
  const params: any[] = [req.params.id]

  if (dimensionId) { sql += ' AND ar.dimension_id = ?'; params.push(dimensionId) }
  if (category) { sql += ' AND ar.category = ?'; params.push(category) }
  sql += ' ORDER BY ar.confidence DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const rows = db.prepare(sql).all(...params)
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM analysis_results WHERE run_id = ?`).get(req.params.id) as any

  res.json({ data: rows, total: total.cnt })
})

// GET /api/runs/:id/excel-report - read Excel report content as JSON
router.get('/:id/excel-report', authMiddleware, async (req: AuthRequest, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id) as any
  if (!run) return res.status(404).json({ error: 'Run not found' })
  if (!run.excel_report_path || !fs.existsSync(run.excel_report_path)) {
    return res.status(404).json({ error: 'Excel report not found' })
  }

  try {
    const excelPath = run.excel_report_path.replace(/'/g, "'\\''")
    const skillPath = process.env.SKILL_PATH || '/app/skisight_analysis'
    const pythonScript = `import json, sys; sys.path.insert(0, '${skillPath}'); from openpyxl import load_workbook; wb = load_workbook('${excelPath}'); result = {}; [result.__setitem__(sn, [list(r) for r in wb[sn].iter_rows(values_only=True)]) for sn in wb.sheetnames]; print(json.dumps(result, ensure_ascii=False))`
    
    const { stdout } = await execAsync(`python3 -c "${pythonScript}"`)
    const excelData = JSON.parse(stdout)
    res.json({ success: true, sheets: excelData })
  } catch (error: any) {
    console.error('Failed to read Excel report:', error)
    res.status(500).json({ error: 'Failed to read Excel report', message: error.message })
  }
})

// GET /api/runs/:id/view-excel - convert Excel to HTML for iframe viewing
router.get('/:id/view-excel', async (req, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id) as any
  if (!run || !run.excel_report_path || !fs.existsSync(run.excel_report_path)) {
    return res.status(404).send('Excel report not found')
  }

  try {
    const excelPath = run.excel_report_path
    const tempScriptPath = path.join('/tmp', `view_excel_${Date.now()}.py`)
    
    // Clean Python script using raw strings to avoid escaping issues
    const skillPath = process.env.SKILL_PATH || '/app/skisight_analysis'
    const pythonScript = `import sys
sys.path.insert(0, '${skillPath}')
from openpyxl import load_workbook
import json

excel_path = json.loads(sys.argv[1])
wb = load_workbook(excel_path)

html = []
html.append('<html><head><meta charset="utf-8"><style>')
html.append('body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; margin: 0; padding: 16px; background: #f0f2f5; }')
html.append('.sheet-container { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }')
html.append('.sheet-tabs { display: flex; background: #f5f5f5; border-bottom: 1px solid #e0e0e0; padding: 0 8px; }')
html.append('.sheet-tab { padding: 10px 20px; font-size: 13px; font-weight: 500; color: #666; cursor: pointer; border-bottom: 2px solid transparent; }')
html.append('.sheet-tab:hover { color: #1F4E79; }')
html.append('.sheet-tab.active { background: white; color: #1F4E79; border-bottom: 2px solid #1F4E79; font-weight: 600; }')
html.append('.sheet-content { display: none; padding: 20px; overflow-y: auto; max-height: calc(100vh - 180px); }')
html.append('.sheet-content.active { display: block; }')
html.append('table { border-collapse: collapse; font-size: 12px; }')
html.append('td { border: 1px solid #d9d9d9; padding: 6px 10px; }')
html.append('.header-cell { background: #1F4E79; color: white; font-weight: 600; text-align: center; }')
html.append('.num-cell { text-align: right; }')
html.append('.highlight-cell { background: #FFF2CC; }')
html.append('.label-cell { font-weight: bold; color: #1F4E79; }')
html.append('.spacer-row td { border: none; height: 6px; padding: 0; }')
html.append('.fb-cell { border: 1px solid #d9d9d9; padding: 4px 8px; text-align: center; white-space: nowrap; }')
html.append('.fb-btn { background: #ff6b35; color: white; border: none; border-radius: 4px; padding: 3px 10px; font-size: 11px; cursor: pointer; }')
html.append('.fb-btn:hover { background: #e55a2b; }')
html.append('</style></head><body>')
html.append('<div class="sheet-container">')
html.append('<div class="sheet-tabs">')
for name in wb.sheetnames:
    html.append(f'<div class="sheet-tab" data-sheet="{name}">{name}</div>')
html.append('</div>')

for name in wb.sheetnames:
    ws = wb[name]
    html.append(f'<div class="sheet-content" data-sheet="{name}">')
    html.append('<table>')
    
    # Build merged cells lookup: (row, col) -> {rowspan, colspan, is_master}
    merged = {}
    for mc in ws.merged_cells.ranges:
        for r in range(mc.min_row, mc.max_row + 1):
            for c in range(mc.min_col, mc.max_col + 1):
                if r == mc.min_row and c == mc.min_col:
                    merged[(r, c)] = {'rowspan': mc.max_row - mc.min_row + 1, 'colspan': mc.max_col - mc.min_col + 1, 'master': True}
                else:
                    merged[(r, c)] = {'master': False}
    
    for row_idx in range(1, ws.max_row + 1):
        row = ws[row_idx]
        vals = [cell.value for cell in row]
        
        if all(v is None or v == '' for v in vals):
            html.append('<tr class="spacer-row"><td colspan="20"></td></tr>')
            continue
        
        # Detect if this is a header row
        is_header = False
        for cell in row:
            if cell.fill and cell.fill.fgColor:
                fcc = str(cell.fill.fgColor).upper().replace('FF', '')
                if fcc == '1F4E79':
                    is_header = True
                    break
        
        html.append('<tr>')
        row_vals = []
        for col_idx, cell in enumerate(row, start=1):
            key = (row_idx, col_idx)
            if key in merged:
                info = merged[key]
                if not info.get('master', True):
                    continue
                rs = info.get('rowspan', 1)
                cs = info.get('colspan', 1)
            else:
                rs, cs = 1, 1
            
            val = cell.value
            cls = ''
            
            # Detect cell styles
            fc = ''
            if cell.fill and cell.fill.fgColor:
                fc = str(cell.fill.fgColor).upper().replace('FF', '')
            
            if fc == '1F4E79':
                cls = 'header-cell'
            elif fc in ('FFF2CC', 'FFFFF2CC'):
                cls = 'highlight-cell'
            elif isinstance(val, (int, float)):
                cls = 'num-cell'
            
            # Section label: bold blue text, short
            if val and isinstance(val, str) and len(val) < 30 and cell.font and cell.font.bold:
                ftc = ''
                if cell.font.color:
                    ftc = str(cell.font.color).upper().replace('FF', '')
                if ftc == '1F4E79':
                    cls = 'label-cell'
            
            ra = f' rowspan="{rs}"' if rs > 1 else ''
            ca = f' colspan="{cs}"' if cs > 1 else ''
            dv = val if val is not None else ''
            html.append(f'<td{ra}{ca} class="{cls}">{dv}</td>')
            row_vals.append(str(dv))
        
        # Add feedback column only for "分析明细" sheet
        is_detail_sheet = name == '\u5206\u6790\u660e\u7ec6'
        if is_detail_sheet:
            if is_header:
                html.append('<td class="header-cell fb-cell">\\u64cd\\u4f5c</td>')
            else:
                safe_vals = json.dumps(row_vals, ensure_ascii=False).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                html.append(f'<td class="fb-cell"><button class="fb-btn" data-sheet="{name}" data-row="{row_idx}" data-vals=\\'{safe_vals}\\'>\\u53cd\\u9988</button></td>')
        else:
            html.append('<td></td>')
        
        html.append('</tr>')
    
    html.append('</table></div>')

html.append('</div>')
html.append('<script>')
html.append('document.querySelectorAll(".sheet-tab").forEach(function(tab) {')
html.append('  tab.onclick = function() {')
html.append('    var s = tab.dataset.sheet;')
html.append('    document.querySelectorAll(".sheet-tab").forEach(t => t.classList.remove("active"));')
html.append('    document.querySelectorAll(".sheet-content").forEach(c => c.classList.remove("active"));')
html.append('    document.querySelector(\\'.sheet-tab[data-sheet="\\' + s + \\'"]\\').classList.add("active");')
html.append('    document.querySelector(\\'.sheet-content[data-sheet="\\' + s + \\'"]\\').classList.add("active");')
html.append('  };')
html.append('});')
html.append('var ft = document.querySelector(".sheet-tab");')
html.append('var fc = document.querySelector(".sheet-content");')
html.append('if (ft) ft.classList.add("active");')
html.append('if (fc) fc.classList.add("active");')
html.append('document.querySelectorAll(".fb-btn").forEach(function(btn) {')
html.append('  btn.onclick = function() {')
html.append('    var sheet = btn.dataset.sheet;')
html.append('    var row = btn.dataset.row;')
html.append('    var vals = btn.dataset.vals;')
html.append('    window.parent.postMessage({ type: "feedback", sheet: sheet, row: row, rowData: vals }, "*");')
html.append('  };')
html.append('});')
html.append('</script>')
html.append('</body></html>')

print(''.join(html))`
    
    fs.writeFileSync(tempScriptPath, pythonScript, 'utf-8')
    
    const { stdout } = await execAsync(`python3 "${tempScriptPath}" '${JSON.stringify(excelPath)}'`)
    try { fs.unlinkSync(tempScriptPath) } catch {}
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(stdout)
  } catch (error: any) {
    console.error('Failed to convert Excel to HTML:', error)
    res.status(500).send(`<html><body style="padding:40px;text-align:center;color:#888;font-family:sans-serif;"><h2>报告渲染失败</h2><p>${error.message}</p></body></html>`)
  }
})

// GET /api/runs/:id/download-excel - download Excel file
router.get('/:id/download-excel', (req, res) => {
  const run = db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(req.params.id) as any
  if (!run || !run.excel_report_path || !fs.existsSync(run.excel_report_path)) {
    return res.status(404).send('Excel report not found')
  }

  const fileName = `${run.name || '分析报告'}.xlsx`
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
  res.sendFile(run.excel_report_path)
})

export default router
