/**
 * Production data seeding.
 * Imports sessions from Excel on first startup using the API.
 */

import fs from 'fs'
import { execSync } from 'child_process'

const EXCEL_PATH = '/app/chat_data_org.xlsx'

export function seedProductionDataIfNeeded() {
  try {
    console.log('[Seed] Checking if database needs seeding...')
    
    if (!fs.existsSync(EXCEL_PATH)) {
      console.log('[Seed] WARNING: Excel file not found at', EXCEL_PATH)
      return
    }
    
    console.log('[Seed] Importing sessions from Excel via API...')
    
    // Use Python script to parse Excel and import via API
    // Note: Using requests (not curl) since curl may not be installed
    const importScript = `
import openpyxl
import requests

wb = openpyxl.load_workbook('${EXCEL_PATH}')
ws = wb.active

sessions = []
current = None

for row in ws.iter_rows(min_row=2, values_only=False):
    seq, sid, uid, oid, conv = row[0].value, row[1].value, row[2].value, row[3].value, row[4].value
    if seq and sid:
        if current:
            sessions.append(current)
        current = {
            'sequence_num': seq, 
            'session_id': str(sid), 
            'user_id': str(uid or ''), 
            'ocs_session_id': str(oid or ''), 
            'bot_conversation': '', 
            'human_conversation': '', 
            'dissatisfaction_info': ''
        }
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

print(f'[Seed] Found {len(sessions)} sessions from Excel')

# Import via API using requests (not curl)
rows = [{'sequence_num': i+1, **s} for i, s in enumerate(sessions)]
res = requests.post('http://localhost:10000/api/sessions/import', json={'rows': rows})
print(f'[Seed] API response: {res.status_code} - {res.json()}')
`
    
    const result = execSync(`python3 -c "${importScript}"`, {
      encoding: 'utf-8',
      cwd: '/app',
      timeout: 120000
    })
    console.log('[Seed]', result)
    console.log('[Seed] Production data import complete')
  } catch (err: any) {
    console.error('[Seed] Error during seeding:', err.message)
    if (err.stderr) console.error('[Seed] stderr:', err.stderr.toString())
    if (err.stdout) console.error('[Seed] stdout:', err.stdout.toString())
  }
}
