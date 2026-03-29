import db from '../db.js';
export function authMiddleware(req, res, next) {
    const token = req.headers['x-auth-token'];
    if (!token) {
        return res.status(401).json({ error: 'Missing auth token' });
    }
    const user = db.prepare('SELECT id, name, role FROM users WHERE token = ?').get(token);
    if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
}
