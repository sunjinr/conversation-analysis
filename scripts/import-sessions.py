#!/usr/bin/env python3
"""
Import sessions from Excel into SQLite database.
Used during Docker container startup to seed data.
"""

import openpyxl
import sqlite3
import sys
import re
import os

def import_sessions(excel_path, db_path):
    print(f'[Import] Loading Excel from {excel_path}')
    wb = openpyxl.load_workbook(excel_path)
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
                'sequence_num': seq,
                'session_id': session_id,
                'user_id': user_id or '',
                'ocs_session_id': ocs_session_id,
                'bot_conversation': '',
                'human_conversation': '',
                'dissatisfaction_info': '',
            }
        
        if current_session and conversation:
            conv_text = str(conversation)
            if '客服:' in conv_text:
                current_session['human_conversation'] += ('\n' + conv_text if current_session['human_conversation'] else conv_text)
            elif '不满意' in conv_text:
                current_session['dissatisfaction_info'] = conv_text
            else:
                current_session['bot_conversation'] += ('\n' + conv_text if current_session['bot_conversation'] else conv_text)
    
    if current_session:
        sessions.append(current_session)
    
    print(f'[Import] Found {len(sessions)} sessions')
    
    # Connect to database
    db = sqlite3.connect(db_path)
    cursor = db.cursor()
    
    # Clear existing data
    cursor.execute('DELETE FROM session_summaries')
    cursor.execute('DELETE FROM sessions')
    
    # Insert sessions
    for idx, s in enumerate(sessions):
        session_date = ''
        if s['bot_conversation']:
            date_match = re.search(r'\[(\d{4}-\d{2}-\d{2})', s['bot_conversation'])
            if date_match:
                session_date = date_match.group(1)
        
        import uuid
        cursor.execute(
            'INSERT INTO sessions (id, sequence_num, session_id, user_id, ocs_session_id, bot_conversation, human_conversation, dissatisfaction_info, session_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (str(uuid.uuid4()), s['sequence_num'], s['session_id'], s['user_id'], s['ocs_session_id'], s['bot_conversation'], s['human_conversation'], s['dissatisfaction_info'], session_date)
        )
    
    db.commit()
    count = cursor.execute('SELECT COUNT(*) FROM sessions').fetchone()[0]
    db.close()
    
    print(f'[Import] Successfully imported {count} sessions to {db_path}')
    return count

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: import-sessions.py <excel_path> <db_path>')
        sys.exit(1)
    
    excel_path = sys.argv[1]
    db_path = sys.argv[2]
    
    if not os.path.exists(excel_path):
        print(f'[Import] ERROR: Excel file not found: {excel_path}')
        sys.exit(1)
    
    import_sessions(excel_path, db_path)
