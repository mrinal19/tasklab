import React, { useState, useEffect, useMemo } from "react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

// ✅ FIX: Use env variable for API URL (set in Vercel dashboard)
const API = process.env.REACT_APP_API_URL || "https://tasklab-5ydi.onrender.com";

const centerTextPlugin = {
  id: "centerText",
  beforeDraw(chart) {
    const { width, height, ctx } = chart;
    const data = chart.data.datasets[0].data;
    const total = data.reduce((a, b) => a + b, 0);
    const completed = data[0] || 0;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    ctx.save();
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${percent}%`, width / 2, height / 2);
    ctx.restore();
  }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  // ✅ FIX: Default to LOGIN view (isLogin = true), not register
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // ✅ FIX: Both register AND login now save token + log in
  async function handleAuth() {
    if (!email || !password) return alert("Email and password required");
    setLoading(true);
    try {
      const endpoint = isLogin ? "login" : "register";
      const res = await fetch(`${API}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Auth failed"); return; }

      if (!isLogin) {
        // After register, auto-login
        const loginRes = await fetch(`${API}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) { alert("Registered! Please log in."); setIsLogin(true); return; }
        localStorage.setItem("token", loginData.token);
        setToken(loginData.token);
        notify("Welcome! Account created 🎉");
      } else {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        notify("Welcome back! 🚀");
      }
    } catch (e) {
      alert("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks() {
    try {
      const res = await fetch(`${API}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch(e) { console.error("Load tasks failed", e); }
  }

  // ✅ FIX: Only one setTasks call, no double-update conflict
  async function addTask() {
    if (!task.trim()) return;
    try {
      const res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: task })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setTasks(prev => [data, ...prev]); // ✅ single update
      setTask("");
      notify("Task added ✨");
    } catch(e) { alert("Failed to add task"); }
  }

  async function toggleTask(id) {
    await fetch(`${API}/tasks/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    loadTasks();
  }

  async function deleteTask(id) {
    await fetch(`${API}/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    setTasks(prev => prev.filter(t => t.id !== id));
    notify("Deleted 🗑");
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setTasks([]);
  }

  useEffect(() => {
    if (token && token !== "undefined") loadTasks();
  }, [token]);

  const visibleTasks = useMemo(() => {
    let list = tasks;
    if (filter === "active") list = list.filter(t => !t.completed);
    if (filter === "completed") list = list.filter(t => t.completed);
    if (search.trim()) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [tasks, search, filter]);

  const completed = tasks.filter(t => t.completed).length;
  const last7 = tasks.slice(0, 7).reverse();

  const barData = {
    labels: last7.map((_, i) => `Task ${i + 1}`),
    datasets: [
      { label: "Completed", data: last7.map(t => t.completed ? 1 : 0), backgroundColor: "#22c55e" },
      { label: "Pending",   data: last7.map(t => !t.completed ? 1 : 0), backgroundColor: "#ef4444" }
    ]
  };

  // ✅ FIX: Show proper auth screen with visible toggle
  if (!token || token === "undefined") {
    return (
      <div style={styles.authWrap}>
        <div style={styles.authCard}>
          <h2 style={{ marginBottom: "6px" }}>🔥 Taskflow</h2>
          <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "14px" }}>
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </p>

          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAuth()}
            placeholder="Email"
            type="email"
            style={styles.input}
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAuth()}
            type="password"
            placeholder="Password"
            style={styles.input}
          />

          <button
            onClick={handleAuth}
            disabled={loading}
            style={{ ...styles.authBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
          </button>

          <div
            onClick={() => setIsLogin(!isLogin)}
            style={styles.toggleLink}
          >
            {isLogin ? "Don't have an account? Register →" : "Already have an account? Login →"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h2 style={{ marginBottom: "24px" }}>🔥 Taskflow</h2>
        {["dashboard", "logs", "motivation", "music", "meditation"].map(v => (
          <div
            key={v}
            onClick={() => setView(v)}
            style={{
              ...styles.sideItem,
              background: view === v ? "#1e3a5f" : "transparent",
              color: view === v ? "#38bdf8" : "#94a3b8",
              borderRadius: "8px",
              marginBottom: "4px"
            }}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </div>
        ))}
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </div>

      <div style={styles.main}>
        {view === "dashboard" && (
          <div>
            <h1 style={{ marginBottom: "20px" }}>🚀 Command Center</h1>
            <div style={styles.statsRow}>
              <div style={styles.statBox}><h3>{tasks.length}</h3><p>Total</p></div>
              <div style={styles.statBox}><h3>{completed}</h3><p>Done</p></div>
              <div style={styles.statBox}><h3>{tasks.length - completed}</h3><p>Pending</p></div>
              <div style={styles.statBox}>
                <h3>{tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%</h3>
                <p>Rate</p>
              </div>
            </div>
            <div style={styles.dashboardGrid}>
              <div style={styles.panel}>
                <h3>Tasks</h3>
                <div style={styles.inputBox}>
                  <input
                    value={task}
                    onChange={e => setTask(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addTask()}
                    placeholder="Add a new task..."
                    style={styles.input}
                  />
                  <button onClick={addTask} style={styles.addBtn}>Add</button>
                </div>
                <div style={{ display: "flex", gap: "8px", margin: "10px 0" }}>
                  {["all","active","completed"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ ...styles.filterBtn, background: filter === f ? "#3b82f6" : "#1e293b" }}>
                      {f}
                    </button>
                  ))}
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search..." style={{ ...styles.input, flex: 1, fontSize: "12px" }} />
                </div>
                {visibleTasks.length === 0 && (
                  <p style={{ color: "#64748b", textAlign: "center", marginTop: "20px" }}>No tasks yet. Add one above!</p>
                )}
                {visibleTasks.map(t => (
                  <div key={t.id} style={styles.taskCard}>
                    <span
                      onClick={() => toggleTask(t.id)}
                      style={{ cursor: "pointer", textDecoration: t.completed ? "line-through" : "none", opacity: t.completed ? 0.5 : 1 }}
                    >
                      {t.completed ? "✅" : "⬜"} {t.title}
                    </span>
                    <button onClick={() => deleteTask(t.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>❌</button>
                  </div>
                ))}
              </div>
              <div style={styles.panel}>
                <h3>Analytics</h3>
                <Pie
                  data={{
                    labels: ["Completed", "Pending"],
                    datasets: [{
                      data: [completed, tasks.length - completed],
                      backgroundColor: ["#22c55e", "#ef4444"],
                      borderWidth: 0,
                      hoverOffset: 14
                    }]
                  }}
                  options={{
                    cutout: "70%",
                    plugins: {
                      legend: { position: "bottom", labels: { color: "#e2e8f0", padding: 20, font: { size: 13 } } }
                    },
                    animation: { animateScale: true, duration: 800 }
                  }}
                  plugins={[centerTextPlugin]}
                />
                <div style={{ marginTop: "30px" }}>
                  <h4 style={{ marginBottom: "10px" }}>📈 Last 7 Tasks</h4>
                  <Bar data={barData} options={{
                    plugins: { legend: { labels: { color: "#e2e8f0" } } },
                    scales: { x: { ticks: { color: "#94a3b8" } }, y: { ticks: { color: "#94a3b8" } } }
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}
        {view === "logs" && <Logs tasks={tasks} />}
        {view === "motivation" && <Motivation />}
        {view === "music" && <Music />}
        {view === "meditation" && <Meditation />}
      </div>
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function Logs({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const last7 = tasks.slice(0, 7);
  const streak = tasks.reduce((acc, t) => t.completed ? acc + 1 : acc, 0);
  const insight = completed > pending ? "🔥 You're on fire! Keep pushing." : "⚡ Try completing a few more tasks today.";

  return (
    <div>
      <h2 style={{ marginBottom: "20px" }}>📊 Productivity Dashboard</h2>
      {/* ✅ FIX: statCard is now defined inline here */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        {[["Total Tasks", total], ["Completed", completed], ["Pending", pending], ["Streak 🔥", streak]].map(([label, val]) => (
          <div key={label} style={{ flex: 1, background: "#1e293b", padding: "20px", borderRadius: "12px", textAlign: "center" }}>
            <h3 style={{ fontSize: "2rem", margin: 0 }}>{val}</h3>
            <p style={{ color: "#94a3b8", margin: "4px 0 0" }}>{label}</p>
          </div>
        ))}
      </div>
      <div style={{ padding: "15px", borderRadius: "10px", background: "#1e293b", color: "#e2e8f0", marginBottom: "20px" }}>{insight}</div>
      <h3>📅 Recent Activity</h3>
      {last7.map((t, i) => (
        <div key={i} style={{ padding: "12px", marginTop: "10px", borderRadius: "10px", background: "#0f172a", color: "#e2e8f0", display: "flex", justifyContent: "space-between" }}>
          <span>{t.title}</span><span>{t.completed ? "✅" : "❌"}</span>
        </div>
      ))}
    </div>
  );
}

function Motivation() {
  const articles = [
    { title: "Discipline Over Motivation", content: "Motivation fades. Discipline stays. Build systems, not moods." },
    { title: "Consistency Wins", content: "Doing 1% better every day compounds faster than intense bursts." },
    { title: "Start Before You're Ready", content: "Action creates clarity — not the other way around." },
    { title: "Focus is a Skill", content: "In a distracted world, focus is power. Train your attention daily." }
  ];
  return (
    <div>
      <h2 style={{ marginBottom: "20px" }}>📰 Growth Articles</h2>
      {articles.map((a, i) => (
        <div key={i} style={{ padding: "20px", marginBottom: "15px", borderRadius: "12px", background: "#0f172a", color: "#e2e8f0" }}>
          <h3>{a.title}</h3><p style={{ opacity: 0.8 }}>{a.content}</p>
        </div>
      ))}
    </div>
  );
}

function Music() {
  return (
    <div>
      <h2>🎧 Focus Music</h2>
      <iframe width="100%" height="300" src="https://www.youtube.com/embed/5qap5aO4i9A" title="lofi" />
    </div>
  );
}

function Meditation() {
  const [step, setStep] = useState("inhale");
  useEffect(() => {
    const cycle = setInterval(() => {
      setStep(prev => prev === "inhale" ? "hold" : prev === "hold" ? "exhale" : "inhale");
    }, 4000);
    return () => clearInterval(cycle);
  }, []);
  const textMap = { inhale: "Inhale deeply 🌿", hold: "Hold breath ✨", exhale: "Exhale slowly 🌊" };
  const colorMap = { inhale: "#22c55e", hold: "#3b82f6", exhale: "#ef4444" };
  return (
    <div style={{ textAlign: "center" }}>
      <h2>🧘 Guided Meditation</h2>
      <div style={{
        width: "200px", height: "200px", margin: "40px auto", borderRadius: "50%",
        background: colorMap[step], display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontSize: "18px", transition: "all 4s ease",
        transform: step === "inhale" ? "scale(1.2)" : step === "hold" ? "scale(1)" : "scale(0.8)"
      }}>
        {textMap[step]}
      </div>
      <p style={{ opacity: 0.7 }}>Follow the circle. Let your breath guide your mind.</p>
    </div>
  );
}

const styles = {
  authWrap: { display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#020617" },
  authCard: { background: "#0f172a", padding: "40px", borderRadius: "16px", width: "360px", border: "1px solid #1e293b" },
  authBtn: { width: "100%", padding: "12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "15px", fontWeight: "bold", marginTop: "8px" },
  toggleLink: { textAlign: "center", marginTop: "16px", color: "#3b82f6", cursor: "pointer", fontSize: "13px" },
  app: { display: "flex", height: "100vh", background: "#020617", color: "#e2e8f0" },
  sidebar: { width: "220px", background: "#0f172a", color: "white", padding: "24px 16px", display: "flex", flexDirection: "column" },
  sideItem: { padding: "10px 14px", cursor: "pointer", transition: "all 0.2s" },
  logoutBtn: { marginTop: "auto", padding: "10px", background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: "8px", cursor: "pointer" },
  main: { flex: 1, padding: "28px", overflowY: "auto" },
  inputBox: { display: "flex", gap: "8px", marginBottom: "10px" },
  input: { flex: 1, padding: "10px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", outline: "none" },
  addBtn: { padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  filterBtn: { padding: "6px 12px", border: "none", borderRadius: "6px", color: "#e2e8f0", cursor: "pointer", fontSize: "12px" },
  statsRow: { display: "flex", gap: "12px", marginBottom: "20px" },
  statBox: { flex: 1, background: "#1e293b", padding: "16px", borderRadius: "10px", color: "#fff", textAlign: "center" },
  dashboardGrid: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" },
  panel: { background: "#0f172a", border: "1px solid #1e293b", padding: "20px", borderRadius: "12px" },
  taskCard: { display: "flex", justifyContent: "space-between", padding: "10px 14px", marginTop: "8px", background: "#1e293b", borderRadius: "8px" },
  toast: { position: "fixed", bottom: "20px", right: "20px", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "12px 20px", borderRadius: "10px" }
};
