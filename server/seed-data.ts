/**
 * Production data seeding.
 * Imports sessions from Excel on first startup using the API.
 */

import fs from 'fs'
import { execSync } from 'child_process'

const SEED_SCRIPT = '/app/scripts/auto-seed.py'
const EXCEL_PATH = '/app/scripts/seed-data/chat_data_org.xlsx'

export function seedProductionDataIfNeeded() {
  try {
    console.log('[Seed] Checking if database needs seeding...')
    
    if (!fs.existsSync(EXCEL_PATH)) {
      console.log('[Seed] WARNING: Excel file not found at', EXCEL_PATH)
      return
    }
    
    if (!fs.existsSync(SEED_SCRIPT)) {
      console.log('[Seed] WARNING: Seed script not found at', SEED_SCRIPT)
      return
    }
    
    console.log('[Seed] Running auto-seed script...')
    
    const result = execSync(`python3 ${SEED_SCRIPT}`, {
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
