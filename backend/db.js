const Database = require("better-sqlite3");

const db = new Database("tasks.db");

// 🔥 ALWAYS RESET (for stability during dev)
db.exec(`
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tasks;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  completed INTEGER DEFAULT 0,
  user_id INTEGER,
  created_at INTEGER,
  completed_at INTEGER
);
`);

module.exports = db;
