import { Router } from 'express';
import db from '../db.js';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM team_members ORDER BY created_at').all());
});
router.post('/', authMiddleware, (req, res) => {
    const { name, role_description, email } = req.body;
    const id = uuid();
    db.prepare('INSERT INTO team_members (id, name, role_description, email) VALUES (?, ?, ?, ?)')
        .run(id, name, role_description, email || '');
    res.json({ id });
});
router.put('/:id', authMiddleware, (req, res) => {
    const { name, role_description, email } = req.body;
    db.prepare('UPDATE team_members SET name = ?, role_description = ?, email = ? WHERE id = ?')
        .run(name, role_description, email || '', req.params.id);
    res.json({ ok: true });
});
router.delete('/:id', authMiddleware, (req, res) => {
    db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});
export default router;
