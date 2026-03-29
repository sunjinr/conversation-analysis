import { Router } from 'express';
import db from '../db.js';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM dimensions ORDER BY sort_order ASC').all();
    res.json(rows);
});
router.post('/', authMiddleware, (req, res) => {
    const { name, definition, categories, auto_discover, sub_skill_ref } = req.body;
    const id = uuid();
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM dimensions').get();
    db.prepare(`INSERT INTO dimensions (id, name, definition, categories_json, auto_discover, sub_skill_ref, sort_order, enabled, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`).run(id, name, definition, JSON.stringify(categories || []), auto_discover ? 1 : 0, sub_skill_ref || '', (maxOrder.m || 0) + 1, req.user.id);
    res.json({ id });
});
router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM dimensions WHERE id = ?').get(req.params.id);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    res.json(row);
});
router.put('/:id', authMiddleware, (req, res) => {
    const { name, definition, categories, auto_discover, sub_skill_ref, enabled } = req.body;
    db.prepare(`UPDATE dimensions SET name = ?, definition = ?, categories_json = ?, auto_discover = ?, sub_skill_ref = ?, enabled = ? WHERE id = ?`)
        .run(name, definition, JSON.stringify(categories || []), auto_discover ? 1 : 0, sub_skill_ref || '', enabled !== undefined ? (enabled ? 1 : 0) : 1, req.params.id);
    res.json({ ok: true });
});
router.delete('/:id', authMiddleware, (req, res) => {
    db.prepare('DELETE FROM dimensions WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});
export default router;
