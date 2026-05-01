/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { Pie, Bar } from "react-chartjs-2";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);
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

const API = "https://tasklab-5ydi.onrender.com";
const theme = {
  bg: "linear-gradient(135deg, #0f172a, #020617)",
  card: "rgba(15, 23, 42, 0.7)",
  border: "rgba(255,255,255,0.08)",
  text: "#e2e8f0",
  accent: "#3b82f6"
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState("");

  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [view, setView] = useState("dashboard");

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  async function handleAuth() {
    const endpoint = isLogin ? "login" : "register";

    const res = await fetch(`${API}/${endpoint}`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) return alert(data.error);

    if (isLogin) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    } else {
      alert("Registered! Now login.");
      setIsLogin(true);
    }
  }

  async function loadTasks() {
    const res = await fetch(`${API}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  }

  async function addTask() {
    if (!task.trim()) return;

    const res = await fetch(`${API}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: task })
    });

const data = await res.json();
setTasks(Array.isArray(data) ? data : []);
    
    if (!res.ok) return alert(data.error);

    setTasks(prev => [data, ...prev]);
    setTask("");
    notify("Task added ✨");
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

  useEffect(() => {
  if (token) loadTasks();
}, [token]);

  const visibleTasks = useMemo(() => {
    let list = tasks;

    if (filter === "active") list = list.filter(t => !t.completed);
    if (filter === "completed") list = list.filter(t => t.completed);

    if (search.trim()) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    return list;
  }, [tasks, search, filter]);

  const completed = tasks.filter(t => t.completed).length;
  const last7 = tasks.slice(0, 7).reverse();

const barData = {
  labels: last7.map((_, i) => `Task ${i + 1}`),
  datasets: [
    {
      label: "Completed",
      data: last7.map(t => (t.completed ? 1 : 0)),
      backgroundColor: "#22c55e"
    },
    {
      label: "Pending",
      data: last7.map(t => (!t.completed ? 1 : 0)),
      backgroundColor: "#ef4444"
    }
  ]
};
  

  if (!token) {
    return (
      <div style={styles.authWrap}>
        <div style={styles.authCard}>
          <h2>{isLogin ? "Login" : "Register"}</h2>
          <input onChange={e=>setEmail(e.target.value)} placeholder="Email" style={styles.input}/>
          <input onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" style={styles.input}/>
          <button onClick={handleAuth}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2>🔥 Taskflow</h2>

        {["dashboard","logs","motivation","music","meditation"].map(v => (
          <div key={v} onClick={()=>setView(v)} style={styles.sideItem}>
            {v.toUpperCase()}
          </div>
        ))}

        <button onClick={()=>{localStorage.removeItem("token"); setToken(null);}}>
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div>

            <h1>🚀 Command Center</h1>

            <div style={styles.statsRow}>
              <div style={styles.statBox}><h3>{tasks.length}</h3><p>Total</p></div>
              <div style={styles.statBox}><h3>{completed}</h3><p>Done</p></div>
              <div style={styles.statBox}><h3>{tasks.length - completed}</h3><p>Pending</p></div>
              <div style={styles.statBox}>
                <h3>{tasks.length ? Math.round((completed/tasks.length)*100) : 0}%</h3>
                <p>Rate</p>
              </div>
            </div>

            <div style={styles.dashboardGrid}>
              <div style={styles.panel}>
                <h3>Tasks</h3>

                <div style={styles.inputBox}>
                  <input value={task} onChange={e=>setTask(e.target.value)} style={styles.input}/>
                  <button onClick={addTask}>Add</button>
                </div>

                {visibleTasks.map(t => (
                  <div key={t.id} style={styles.taskCard}>
                    <span onClick={()=>toggleTask(t.id)}>
                      {t.completed ? "✔ " : ""}{t.title}
                    </span>
                    <button onClick={()=>deleteTask(t.id)}>❌</button>
                  </div>
                ))}
              </div>

              <div style={styles.panel}>
                <h3>Analytics</h3>
                <Pie
  data={{
    labels: ["Completed", "Pending"],
    datasets: [
      {
        data: [completed, tasks.length - completed],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderWidth: 0,
        hoverOffset: 14,
        cutout: "70%" // 🔥 makes it donut style
      }
    ]
  }}
  options={{
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#e2e8f0",
          padding: 20,
          font: { size: 13 }
        }
      },
      tooltip: {
        enabled: true
      }
    },
    animation: {
      animateScale: true,
      duration: 800
    }
  }}
  plugins={[centerTextPlugin]}
/>
<div style={{ marginTop: "30px" }}>
  <h4 style={{ marginBottom: "10px" }}>📈 Last 7 Tasks</h4>

  <Bar
    data={barData}
    options={{
      plugins: {
        legend: {
          labels: {
            color: "#e2e8f0"
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#94a3b8" }
        },
        y: {
          ticks: { color: "#94a3b8" }
        }
      }
    }}
  />
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

/* ---------- EXTRA COMPONENTS ---------- */

function Logs({ tasks }) {

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  // last 7 tasks (recent activity)
  const last7 = tasks.slice(0, 7);

  // streak (simple version)
  const streak = tasks.reduce((acc, t) => {
    return t.completed ? acc + 1 : acc;
  }, 0);

  const insight =
    completed > pending
      ? "🔥 You’re on fire! Keep pushing."
      : "⚡ Try completing a few more tasks today.";

  return (
    <div>

      <h2 style={{marginBottom:"20px"}}>📊 Productivity Dashboard</h2>

      {/* SUMMARY CARDS */}
      <div style={{display:"flex", gap:"20px", marginBottom:"20px"}}>

        <div style={styles.statCard}>
          <h3>{total}</h3>
          <p>Total Tasks</p>
        </div>

        <div style={styles.statCard}>
          <h3>{completed}</h3>
          <p>Completed</p>
        </div>

        <div style={styles.statCard}>
          <h3>{pending}</h3>
          <p>Pending</p>
        </div>

        <div style={styles.statCard}>
          <h3>{streak}</h3>
          <p>Streak 🔥</p>
        </div>

      </div>

      {/* INSIGHT */}
      <div style={{
        padding:"15px",
        borderRadius:"10px",
        background:"#1e293b",
        color:"#e2e8f0",
        marginBottom:"20px"
      }}>
        {insight}
      </div>

      {/* LAST 7 TASKS */}
      <h3>📅 Recent Activity</h3>

      {last7.map((t, i) => (
        <div
          key={i}
          style={{
            padding:"12px",
            marginTop:"10px",
            borderRadius:"10px",
            background:"#0f172a",
            color:"#e2e8f0",
            display:"flex",
            justifyContent:"space-between",
            transition:"all 0.3s"
          }}
          onMouseEnter={e=>{
            e.currentTarget.style.transform="translateY(-3px)";
            e.currentTarget.style.background="#1e293b";
          }}
          onMouseLeave={e=>{
            e.currentTarget.style.transform="translateY(0)";
            e.currentTarget.style.background="#0f172a";
          }}
        >
          <span>{t.title}</span>
          <span>{t.completed ? "✔" : "❌"}</span>
        </div>
      ))}

      {/* MINI ACTIVITY BAR */}
      <h3 style={{marginTop:"30px"}}>📈 Activity Overview</h3>

      <div style={{display:"flex", gap:"8px", marginTop:"10px"}}>
        {last7.map((t, i) => (
          <div
            key={i}
            style={{
              width:"20px",
              height: t.completed ? "60px" : "30px",
              background: t.completed ? "#22c55e" : "#ef4444",
              borderRadius:"4px",
              transition:"all 0.3s"
            }}
          />
        ))}
      </div>

    </div>
  );
}

function Motivation() {
  const articles = [
    {
      title: "Discipline Over Motivation",
      content:
        "Motivation fades. Discipline stays. The people who succeed aren't always the most motivated — they are the most consistent. Build systems, not moods."
    },
    {
      title: "Consistency Wins",
      content:
        "Doing 1% better every day compounds faster than intense bursts. Small, boring actions repeated daily create unstoppable momentum."
    },
    {
      title: "Start Before You’re Ready",
      content:
        "Waiting for the perfect moment is procrastination in disguise. Action creates clarity — not the other way around."
    },
    {
      title: "Focus is a Skill",
      content:
        "In a distracted world, focus is power. Every time you resist distraction, you're literally training your brain to become sharper."
    }
  ];

  return (
    <div>
      <h2 style={{marginBottom:"20px"}}>📰 Growth Articles</h2>

      {articles.map((a, i) => (
        <div
          key={i}
          style={{
            padding:"20px",
            marginBottom:"15px",
            borderRadius:"12px",
            background:"#0f172a",
            color:"#e2e8f0",
            transition:"all 0.3s",
            cursor:"pointer"
          }}
          onMouseEnter={e=>{
            e.currentTarget.style.transform="translateY(-5px)";
            e.currentTarget.style.background="#1e293b";
          }}
          onMouseLeave={e=>{
            e.currentTarget.style.transform="translateY(0)";
            e.currentTarget.style.background="#0f172a";
          }}
        >
          <h3>{a.title}</h3>
          <p style={{opacity:0.8}}>{a.content}</p>
        </div>
      ))}
    </div>
  );
}

function Music() {
  return (
    <div>
      <h2>🎧 Focus Music</h2>
      <iframe width="100%" height="300"
        src="https://www.youtube.com/embed/5qap5aO4i9A"
        title="lofi">
      </iframe>
    </div>
  );
}

function Meditation() {
  const [step, setStep] = useState("inhale");

  useEffect(() => {
    const cycle = setInterval(() => {
      setStep(prev =>
        prev === "inhale"
          ? "hold"
          : prev === "hold"
          ? "exhale"
          : "inhale"
      );
    }, 4000);

    return () => clearInterval(cycle);
  }, []);

  const textMap = {
    inhale: "Inhale deeply 🌿",
    hold: "Hold your breath ✨",
    exhale: "Exhale slowly 🌊"
  };

  const colorMap = {
    inhale: "#22c55e",
    hold: "#3b82f6",
    exhale: "#ef4444"
  };

  return (
    <div style={{textAlign:"center"}}>
      <h2>🧘 Guided Meditation</h2>

      <div
        style={{
          width:"200px",
          height:"200px",
          margin:"40px auto",
          borderRadius:"50%",
          background: colorMap[step],
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          color:"white",
          fontSize:"18px",
          transition:"all 4s ease",
          transform:
            step === "inhale"
              ? "scale(1.2)"
              : step === "hold"
              ? "scale(1)"
              : "scale(0.8)"
        }}
      >
        {textMap[step]}
      </div>

      <p style={{opacity:0.7}}>
        Follow the circle. Let your breath guide your mind.
      </p>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  app:{display:"flex",height:"100vh"},
  sidebar:{width:"220px",background:"#0f172a",color:"white",padding:"20px"},
  sideItem:{padding:"10px",cursor:"pointer"},
  main:{flex:1,padding:"20px"},
  inputBox:{display:"flex"},
  input:{flex:1,padding:"10px"},
  statsRow:{display:"flex",gap:"10px",marginBottom:"20px"},
  statBox:{flex:1,background:"#1e293b",padding:"10px",borderRadius:"8px",color:"#fff"},
  dashboardGrid:{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"20px"},
  panel:{background:"#0f172a",padding:"15px",borderRadius:"10px"},
  taskCard:{display:"flex",justifyContent:"space-between",padding:"10px",marginTop:"10px",background:"#1e293b",borderRadius:"8px"},
  toast:{position:"fixed",bottom:"20px",right:"20px",background:"#000",color:"#fff",padding:"10px"}
};
