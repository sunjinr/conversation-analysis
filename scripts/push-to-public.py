#!/usr/bin/env python3
"""Push data from local to public platform"""

import openpyxl
import json
import requests
import base64
import sqlite3
import os
from datetime import datetime

PUBLIC_API = 'https://cco-analysis.onrender.com/api'
LOCAL_DB = '/Users/huahong/Downloads/coding vibe/conversation-analysis/data/analysis.db'
EXCEL_FILE = '/Users/huahong/Downloads/chat_data_org.xlsx'

def import_sessions():
    """Import 98 sessions from Excel to public platform"""
    print('=== Importing Sessions ===')
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb.active
    
    sessions = []
    current_session = None
    
    for row in ws.iter_rows(min_row=2, values_only=False):
        seq = row[0].value
        session_id = row[1].value
        user_id = str(row[2].value) if row[2].value else None
        ocs_session_id = row[3].value if row[3].value else ''
        conversation = row[4].value
        
        if seq and session_id:
            if current_session:
                sessions.append(current_session)
            current_session = {
                'session_id': session_id,
                'user_id': user_id,
                'ocs_session_id': ocs_session_id,
                'bot_conversation': '',
                'human_conversation': '',
                'dissatisfaction_info': '',
                'session_date': '',
                'summary_text': ''
            }
        
        if current_session and conversation:
            conv_text = str(conversation)
            # Determine if bot or human conversation
            if '会员:' in conv_text and '客服:' not in conv_text and '机器人:' not in conv_text:
                if current_session['bot_conversation']:
                    current_session['bot_conversation'] += '\n' + conv_text
                else:
                    current_session['bot_conversation'] = conv_text
            elif '客服:' in conv_text:
                if current_session['human_conversation']:
                    current_session['human_conversation'] += '\n' + conv_text
                else:
                    current_session['human_conversation'] = conv_text
            elif '机器人:' in conv_text or '消息卡片' in conv_text or '命令消息' in conv_text:
                if current_session['bot_conversation']:
                    current_session['bot_conversation'] += '\n' + conv_text
                else:
                    current_session['bot_conversation'] = conv_text
            elif '不满意' in conv_text:
                current_session['dissatisfaction_info'] = conv_text
            else:
                # Might be continuation of bot conversation
                if not current_session['bot_conversation']:
                    current_session['bot_conversation'] = conv_text
                elif '机器人' in conv_text or '消息卡片' in conv_text:
                    current_session['bot_conversation'] += '\n' + conv_text
    
    if current_session:
        sessions.append(current_session)
    
    # Extract session date from conversation
    for session in sessions:
        if session['bot_conversation']:
            import re
            date_match = re.search(r'\[(\d{4}-\d{2}-\d{2})', session['bot_conversation'])
            if date_match:
                session['session_date'] = date_match.group(1)
    
    print(f'Found {len(sessions)} sessions')
    
    # Import all at once (API clears existing data before import)
    payload = {
        'rows': [{
            'sequence_num': idx + 1,
            'session_id': s['session_id'],
            'user_id': s['user_id'],
            'ocs_session_id': s['ocs_session_id'],
            'bot_conversation': s['bot_conversation'],
            'human_conversation': s['human_conversation'],
            'dissatisfaction_info': s['dissatisfaction_info'],
        } for idx, s in enumerate(sessions)]
    }
    res = requests.post(f'{PUBLIC_API}/sessions/import', json=payload)
    data = res.json()
    print(f'Imported all sessions: {data.get("imported", 0)} sessions - {data}')
    
    print(f'✅ Imported {len(sessions)} sessions')
    return sessions

def import_latest_insight():
    """Import latest insight analysis with Excel report"""
    print('\n=== Importing Latest Insight ===')
    
    conn = sqlite3.connect(LOCAL_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get latest run
    cursor.execute('SELECT * FROM analysis_runs ORDER BY created_at DESC LIMIT 1')
    run = dict(cursor.fetchone())
    
    print(f'Latest run: {run["name"]}')
    print(f'Total sessions: {run["total_sessions"]}')
    print(f'Processed: {run["processed_sessions"]}')
    
    # Read Excel report
    excel_base64 = ''
    excel_path = run.get('excel_report_path', '')
    if excel_path and os.path.exists(excel_path):
        with open(excel_path, 'rb') as f:
            excel_base64 = base64.b64encode(f.read()).decode('utf-8')
        print(f'Excel report size: {len(excel_base64)} bytes (base64)')
    
    # Import via API
    payload = {
        'id': run['id'],
        'name': run['name'],
        'user_question': run.get('user_question', ''),
        'total_sessions': run['total_sessions'],
        'processed_sessions': run['processed_sessions'],
        'summary_json': run['summary_json'],
        'excel_report_base64': excel_base64,
        'created_at': run['created_at'],
        'completed_at': run['completed_at']
    }
    
    res = requests.post(f'{PUBLIC_API}/runs/import', json=payload)
    data = res.json()
    print(f'Import result: {data}')
    
    conn.close()
    print('✅ Imported latest insight')

def import_scenarios():
    """Import scenarios"""
    print('\n=== Importing Scenarios ===')
    
    conn = sqlite3.connect(LOCAL_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM scenarios')
    scenarios = [dict(row) for row in cursor.fetchall()]
    
    for scenario in scenarios:
        payload = {
            'name': scenario['name'],
            'description': scenario['description'],
            'matched_count': scenario.get('matched_count', 0)
        }
        res = requests.post(f'{PUBLIC_API}/scenarios', json=payload)
        data = res.json()
        print(f'Imported scenario: {scenario["name"]} - {data.get("id", data.get("error", "OK"))}')
    
    conn.close()
    print('✅ Imported scenarios')

if __name__ == '__main__':
    import_sessions()
    import_latest_insight()
    import_scenarios()
    print('\n🎉 All data imported successfully!')
