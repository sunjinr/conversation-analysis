#!/usr/bin/env node
/**
 * Production startup script.
 * Runs on container start to ensure database is seeded with default data.
 * Only seeds if database is empty (only has the mock session).
 */

import sqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = '/tmp/data/analysis.db';
const EXCEL_PATH = '/app/chat_data_org.xlsx';

console.log('[Startup] Checking database seed status...');

try {
  const db = sqlite3(DB_PATH);
  
  const sessionCount = db.prepare('SELECT COUNT(*) as cnt FROM sessions').get().cnt;
  console.log(`[Startup] Current sessions: ${sessionCount}`);
  
  if (sessionCount <= 1) {
    console.log('[Startup] Database is empty, seeding with default data...');
    
    // Run the Python import script
    if (fs.existsSync(EXCEL_PATH)) {
      console.log('[Startup] Importing sessions from Excel...');
      const result = execSync(`python3 /app/scripts/import-sessions.py "${EXCEL_PATH}"`, {
        encoding: 'utf-8',
        cwd: '/app'
      });
      console.log('[Startup]', result);
    } else {
      console.log('[Startup] WARNING: Excel file not found at', EXCEL_PATH);
    }
    
    db.close();
    console.log('[Startup] Seeding complete');
  } else {
    console.log('[Startup] Database already seeded, skipping');
    db.close();
  }
} catch (err) {
  console.error('[Startup] Error during seed check:', err.message);
}
