#!/usr/bin/env node
/**
 * Push data from local database to public platform
 */

import sqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB = path.join(__dirname, '..', 'data', 'analysis.db');
const PUBLIC_API = 'https://cco-analysis.onrender.com/api';

const localDb = new sqlite3(LOCAL_DB);

async function pushSessions() {
  console.log('=== Pushing Sessions ===');
  const sessions = localDb.prepare('SELECT * FROM sessions').all();
  console.log(`Found ${sessions.length} sessions locally`);

  // Export to JSON for import
  const sessionsJson = path.join(__dirname, 'sessions-export.json');
  fs.writeFileSync(sessionsJson, JSON.stringify(sessions, null, 2));
  console.log(`Exported sessions to ${sessionsJson}`);

  // Import in batches via API
  const BATCH_SIZE = 10;
  for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
    const batch = sessions.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${PUBLIC_API}/sessions/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions: batch })
    });
    const data = await res.json();
    console.log(`Imported batch ${Math.floor(i/BATCH_SIZE) + 1}: ${data.imported || 0} sessions`);
  }
  
  fs.unlinkSync(sessionsJson);
  console.log(`✅ Pushed ${sessions.length} sessions`);
}

async function pushInsights() {
  console.log('\n=== Pushing Insights (Analysis Runs) ===');
  const runs = localDb.prepare('SELECT * FROM analysis_runs ORDER BY created_at DESC').all();
  console.log(`Found ${runs.length} analysis runs locally`);

  for (const run of runs) {
    let excelBase64 = '';
    if (run.excel_path && fs.existsSync(run.excel_path)) {
      excelBase64 = fs.readFileSync(run.excel_path).toString('base64');
    }

    const res = await fetch(`${PUBLIC_API}/runs/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: run.id,
        name: run.name,
        user_question: run.user_question,
        total_sessions: run.total_sessions,
        processed_sessions: run.processed_sessions,
        summary_json: run.summary_json,
        excel_report_base64: excelBase64,
        created_at: run.created_at,
        completed_at: run.completed_at
      })
    });
    const data = await res.json();
    console.log(`Imported run: ${run.name} - ${data.ok ? 'OK' : data.error}`);
    
    // Only push latest insight
    break;
  }
}

async function pushScenarios() {
  console.log('\n=== Pushing Scenarios ===');
  const scenarios = localDb.prepare('SELECT * FROM scenarios').all();
  console.log(`Found ${scenarios.length} scenarios`);
  
  for (const scenario of scenarios) {
    const res = await fetch(`${PUBLIC_API}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: scenario.name,
        description: scenario.description,
        matched_count: scenario.matched_count
      })
    });
    const data = await res.json();
    console.log(`Imported scenario: ${scenario.name} - ${data.id ? 'OK' : data.error}`);
  }
}

async function main() {
  try {
    await pushSessions();
    await pushInsights();
    await pushScenarios();
    console.log('\n✅ All data pushed successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    localDb.close();
  }
}

main();
