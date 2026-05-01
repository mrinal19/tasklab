const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const router = express.Router();
const SECRET = "secret123";

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hash);
    res.json({ message: "User created" });
  } catch {
    res.status(400).json({ error: "User exists" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user) return res.status(400).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign({ id: user.id, email }, SECRET);
  res.json({ token });
});

module.exports = router;
