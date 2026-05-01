const express = require("express");
const cors = require("cors");
const db = require("./db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "secret123";

/* ---------- HEALTH ---------- */
app.get("/", (req, res) => {
  res.json({ message: "Backend running 🚀" });
});

/* ---------- AUTH ---------- */

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    db.prepare("INSERT INTO users (email, password) VALUES (?, ?)")
      .run(email, hash);

    res.json({ message: "Registered" });
  } catch {
    res.status(400).json({ error: "User exists" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE email=?")
    .get(email);

  if (!user) return res.status(400).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign({ id: user.id }, SECRET);

  res.json({ token });
});

/* ---------- AUTH FIX ---------- */
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token" });
  }

  const token = header.startsWith("Bearer ")
    ? header.split(" ")[1]
    : header;

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------- TASKS ---------- */

app.get("/tasks", auth, (req, res) => {
  const tasks = db.prepare(
    "SELECT * FROM tasks WHERE user_id=? ORDER BY id DESC"
  ).all(req.user.id);

  res.json(tasks);
});

app.post("/tasks", auth, (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title required" });
    }

    const result = db.prepare(`
      INSERT INTO tasks (title, user_id, created_at)
      VALUES (?, ?, ?)
    `).run(title, req.user.id, Date.now());

    const task = db.prepare("SELECT * FROM tasks WHERE id=?")
      .get(result.lastInsertRowid);

    res.json(task);

  } catch (err) {
    console.error("INSERT ERROR:", err.message);
    res.status(500).json({ error: "Insert failed" });
  }
});

app.put("/tasks/:id", auth, (req, res) => {
  const id = req.params.id;

  const task = db.prepare(
    "SELECT * FROM tasks WHERE id=? AND user_id=?"
  ).get(id, req.user.id);

  if (!task) return res.status(404).json({ error: "Not found" });

  db.prepare(`
    UPDATE tasks SET completed=? WHERE id=?
  `).run(task.completed ? 0 : 1, id);

  res.json({ success: true });
});

app.delete("/tasks/:id", auth, (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id=? AND user_id=?")
    .run(req.params.id, req.user.id);

  res.json({ success: true });
});

/* ---------- START ---------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
