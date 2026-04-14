/**
 * Production data seeding.
 * Imports sessions from Excel and seed data on first startup.
 */

import db from './db.js'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const EXCEL_PATH = '/app/chat_data_org.xlsx'

export function seedProductionDataIfNeeded() {
  try {
    const sessionCount = (db.prepare('SELECT COUNT(*) as cnt FROM sessions').get() as any).cnt
    
    if (sessionCount <= 1) {
      console.log('[Seed] Database empty, importing production data...')
      
      if (fs.existsSync(EXCEL_PATH)) {
        // Import sessions from Excel
        console.log('[Seed] Importing sessions from Excel...')
        const result = execSync(
          `python3 /app/scripts/import-sessions.py "${EXCEL_PATH}" /tmp/data/analysis.db`,
          { encoding: 'utf-8', cwd: '/app' }
        )
        console.log('[Seed]', result)
      } else {
        console.log('[Seed] WARNING: Excel file not found at', EXCEL_PATH)
      }
      
      console.log('[Seed] Production data import complete')
    } else {
      console.log(`[Seed] Database already has ${sessionCount} sessions, skipping seed`)
    }
  } catch (err: any) {
    console.error('[Seed] Error during seeding:', err.message)
  }
}
