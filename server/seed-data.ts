/**
 * Production data seeding.
 * Imports sessions from Excel on first startup using the API.
 */

import fs from 'fs'
import { execSync } from 'child_process'

const EXCEL_PATH = '/app/chat_data_org.xlsx'

export function seedProductionDataIfNeeded() {
  try {
    // Check if database already has data by calling API
    // Wait a moment for server to start
    console.log('[Seed] Waiting for server to be ready...')
    execSync('sleep 2')
    
    // Check session count via API
    const checkResult = execSync('curl -s http://localhost:10000/api/sessions', { encoding: 'utf-8' })
    const checkData = JSON.parse(checkResult)
    const sessionCount = checkData.total || 0
    
    console.log(`[Seed] Current sessions: ${sessionCount}`)
    
    if (sessionCount <= 1 && fs.existsSync(EXCEL_PATH)) {
      console.log('[Seed] Database empty, importing sessions from Excel via API...')
      
      // Use Python script to parse Excel and import via API
      const importScript = `
import openpyxl
import requests
import json

wb = openpyxl.load_workbook('${EXCEL_PATH}')
ws = wb.active

sessions = []
current = None

for row in ws.iter_rows(min_row=2, values_only=False):
    seq, sid, uid, oid, conv = row[0].value, row[1].value, row[2].value, row[3].value, row[4].value
    if seq and sid:
        if current:
            sessions.append(current)
        current = {'sequence_num': seq, 'session_id': str(sid), 'user_id': str(uid or ''), 
                   'ocs_session_id': str(oid or ''), 'bot_conversation': '', 'human_conversation': '', 'dissatisfaction_info': ''}
    if current and conv:
        t = str(conv)
        if '客服:' in t:
            current['human_conversation'] += ('\\n' + t if current['human_conversation'] else t)
        elif '不满意' in t:
            current['dissatisfaction_info'] = t
        else:
            current['bot_conversation'] += ('\\n' + t if current['bot_conversation'] else t)

if current:
    sessions.append(current)

rows = [{'sequence_num': i+1, **s} for i, s in enumerate(sessions)]
res = requests.post('http://localhost:10000/api/sessions/import', json={'rows': rows})
print(f'[Seed API] Imported: {res.json()}')
`
      
      const result = execSync(`python3 -c '${importScript}'`, {
        encoding: 'utf-8',
        cwd: '/app',
        timeout: 120000
      })
      console.log('[Seed]', result)
      console.log('[Seed] Production data import complete')
    } else if (sessionCount > 1) {
      console.log('[Seed] Database already seeded, skipping')
    } else {
      console.log('[Seed] WARNING: Excel file not found')
    }
  } catch (err: any) {
    console.error('[Seed] Error during seeding:', err.message)
  }
}
