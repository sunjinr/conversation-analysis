#!/usr/bin/env python3
"""
Auto-seed script for production deployment.
Parses Excel file and imports sessions via API.
"""

import openpyxl
import requests
import sys

EXCEL_PATH = '/app/chat_data_org.xlsx'
API_URL = 'http://localhost:10000/api/sessions/import'

def main():
    print('[Seed] Starting auto-seed from Excel...')
    
    try:
        wb = openpyxl.load_workbook(EXCEL_PATH)
    except Exception as e:
        print(f'[Seed] ERROR: Cannot open Excel: {e}')
        sys.exit(1)
    
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
    
    # Import via API
    rows = [{'sequence_num': i+1, **s} for i, s in enumerate(sessions)]
    
    try:
        res = requests.post(API_URL, json={'rows': rows}, timeout=60)
        print(f'[Seed] API response: {res.status_code} - {res.json()}')
    except Exception as e:
        print(f'[Seed] ERROR: API call failed: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()
