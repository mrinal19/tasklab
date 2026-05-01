const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware');

const router = express.Router();
router.use(authenticate);

// GET /api/users - list all users (admin only, or for member search)
router.get('/', (req, res) => {
  const users = db.prepare(
    'SELECT id, name, email, role, created_at FROM users ORDER BY name'
  ).all();
  res.json(users);
});

// GET /api/users/me
router.get('/me', (req, res) => {
  res.json(req.user);
});

// PUT /api/users/:id/role - change role (global admin only)
router.put('/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or member' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

module.exports = router;
