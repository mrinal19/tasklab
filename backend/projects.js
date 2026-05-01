const express = require('express');
const verify = require('./middleware');
const db = require('./db');

const router = express.Router();

// Create project
router.post('/', verify, (req, res) => {
  const { name } = req.body;

  const result = db.prepare(
    'INSERT INTO projects (name, owner_id) VALUES (?, ?)'
  ).run(name, req.user.id);

  db.prepare(
    'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)'
  ).run(result.lastInsertRowid, req.user.id);

  res.json({ id: result.lastInsertRowid, name });
});

// Get projects
router.get('/', verify, (req, res) => {
  const projects = db.prepare(`
    SELECT p.* FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = ?
  `).all(req.user.id);

  res.json(projects);
});

// Invite user
router.post('/:id/invite', verify, (req, res) => {
  const { email } = req.body;
  const project_id = req.params.id;

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user) return res.status(404).json({ error: "User not found" });

  db.prepare(
    'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)'
  ).run(project_id, user.id);

  res.json({ message: "User invited" });
});

module.exports = router;
