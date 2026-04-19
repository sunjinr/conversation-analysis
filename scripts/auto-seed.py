#!/usr/bin/env python3
"""
Auto-seed script for production deployment.
Parses Excel file and imports sessions via API.
Also imports insight (analysis run) data from seed JSON.
"""

import openpyxl
import requests
import json
import sys
import os

EXCEL_PATH = '/app/scripts/seed-data/chat_data_org.xlsx'
INSIGHT_SEED_PATH = '/app/scripts/seed-data/insight-seed.json'
DASHBOARD_INSIGHT_SEED_PATH = '/app/scripts/seed-data/dashboard-insight-seed.json'
SESSIONS_API = 'http://localhost:10000/api/sessions/import'
RUNS_API = 'http://localhost:10000/api/runs/import'

def import_sessions():
    print('[Seed] Importing sessions from Excel...')
    
    try:
        wb = openpyxl.load_workbook(EXCEL_PATH)
    except Exception as e:
        print(f'[Seed] ERROR: Cannot open Excel: {e}')
        return False
    
    ws = wb.active
    sessions = []
    current = None
    
    for row in ws.iter_rows(min_row=2, values_only=False):
        seq = row[0].value
        sid = row[1].value
        uid = row[2].value
        oid = row[3].value
        conv = row[4].value
        
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
                current['human_conversation'] += ('\n' + t if current['human_conversation'] else t)
            elif '不满意' in t:
                current['dissatisfaction_info'] = t
            else:
                current['bot_conversation'] += ('\n' + t if current['bot_conversation'] else t)
    
    if current:
        sessions.append(current)
    
    print(f'[Seed] Parsed {len(sessions)} sessions from Excel')
    
    rows = [{'sequence_num': i+1, **s} for i, s in enumerate(sessions)]
    
    try:
        res = requests.post(SESSIONS_API, json={'rows': rows}, timeout=60)
        print(f'[Seed] Sessions API response: {res.status_code} - {res.json()}')
        return True
    except Exception as e:
        print(f'[Seed] ERROR: Sessions API call failed: {e}')
        return False

def import_insight():
    print('[Seed] Importing insight data...')
    
    if not os.path.exists(INSIGHT_SEED_PATH):
        print(f'[Seed] WARNING: Insight seed file not found at {INSIGHT_SEED_PATH}')
        return False
    
    try:
        with open(INSIGHT_SEED_PATH, 'r') as f:
            seed_data = json.load(f)
        
        res = requests.post(RUNS_API, json=seed_data, timeout=60)
        print(f'[Seed] Insight API response: {res.status_code} - {res.json()}')
        return True
    except Exception as e:
        print(f'[Seed] ERROR: Insight API call failed: {e}')
        return False

def import_dashboard_insight():
    print('[Seed] Importing dashboard insight data...')
    
    if not os.path.exists(DASHBOARD_INSIGHT_SEED_PATH):
        print(f'[Seed] WARNING: Dashboard insight seed file not found at {DASHBOARD_INSIGHT_SEED_PATH}')
        return False
    
    try:
        with open(DASHBOARD_INSIGHT_SEED_PATH, 'r') as f:
            seed_data = json.load(f)
        
        res = requests.post(RUNS_API, json=seed_data, timeout=60)
        print(f'[Seed] Dashboard Insight API response: {res.status_code} - {res.json()}')
        return True
    except Exception as e:
        print(f'[Seed] ERROR: Dashboard Insight API call failed: {e}')
        return False

def main():
    print('[Seed] Starting auto-seed...')
    
    sessions_ok = import_sessions()
    insight_ok = import_insight()
    dashboard_ok = import_dashboard_insight()
    
    if sessions_ok and insight_ok and dashboard_ok:
        print('[Seed] Auto-seed complete')
    elif sessions_ok:
        print('[Seed] Auto-seed complete (some insights failed)')
    else:
        print('[Seed] Auto-seed failed')
        sys.exit(1)

if __name__ == '__main__':
    main()
