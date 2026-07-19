import { useState, useEffect, useRef, useCallback } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────
const r = (a, b) => Math.floor(Math.random() * (b - a) + a);
const rf = (a, b, d = 2) => +(Math.random() * (b - a) + a).toFixed(d);
const MAX_PTS = 30;

// ── Static Data ────────────────────────────────────────────────────────────
const DEVICES = [
  { name: "edge-01", ip: "10.0.0.1", type: "Gateway", cpu: 82, mem: 74, status: "warn" },
  { name: "web-01", ip: "10.0.1.10", type: "Web", cpu: 34, mem: 51, status: "online" },
  { name: "web-02", ip: "10.0.1.11", type: "Web", cpu: 41, mem: 58, status: "online" },
  { name: "db-primary", ip: "10.0.2.5", type: "Database", cpu: 94, mem: 88, status: "warn" },
  { name: "db-replica", ip: "10.0.2.6", type: "Database", cpu: 28, mem: 52, status: "online" },
  { name: "cache-01", ip: "10.0.3.2", type: "Cache", cpu: 19, mem: 76, status: "online" },
  { name: "k8s-node-1", ip: "10.0.4.1", type: "Compute", cpu: 55, mem: 63, status: "online" },
  { name: "k8s-node-2", ip: "10.0.4.2", type: "Compute", cpu: 48, mem: 59, status: "online" },
  { name: "k8s-node-3", ip: "10.0.4.3", type: "Compute", cpu: 61, mem: 66, status: "online" },
  { name: "monitor-01", ip: "10.0.5.1", type: "Monitor", cpu: 12, mem: 33, status: "online" },
  { name: "vpn-gw", ip: "10.0.0.2", type: "VPN", cpu: 24, mem: 41, status: "online" },
  { name: "backup-01", ip: "10.0.6.1", type: "Backup", cpu: 8, mem: 44, status: "offline" },
];

const SERVICES = [
  { name: "API Gateway", status: "ok", latency: 12, uptime: 99.9 },
  { name: "Auth Service", status: "ok", latency: 8, uptime: 100 },
  { name: "Database Cluster", status: "warn", latency: 145, uptime: 99.2 },
  { name: "Cache Layer", status: "ok", latency: 2, uptime: 100 },
  { name: "Message Queue", status: "ok", latency: 5, uptime: 99.8 },
  { name: "CDN Edge", status: "err", latency: 0, uptime: 94.1 },
];

const TOPO_NODES = [
  { id: "inet", x: 150, y: 28, label: "INTERNET", color: "#64748b", r: 18 },
  { id: "fw", x: 150, y: 82, label: "Firewall", color: "#ef4444", r: 14 },
  { id: "lb", x: 150, y: 134, label: "Load Balancer", color: "#f59e0b", r: 14 },
  { id: "w1", x: 72, y: 192, label: "web-01", color: "#3b82f6", r: 12 },
  { id: "w2", x: 150, y: 192, label: "web-02", color: "#3b82f6", r: 12 },
  { id: "w3", x: 228, y: 192, label: "web-03", color: "#3b82f6", r: 12 },
  { id: "db", x: 96, y: 252, label: "DB Primary", color: "#8b5cf6", r: 14 },
  { id: "cache", x: 210, y: 252, label: "Cache", color: "#06b6d4", r: 12 },
];
const TOPO_EDGES = [
  ["inet", "fw"], ["fw", "lb"], ["lb", "w1"], ["lb", "w2"], ["lb", "w3"],
  ["w1", "db"], ["w2", "db"], ["w3", "cache"], ["cache", "db"],
];

const LOG_SOURCES = ["edge-01", "web-01", "web-02", "db-primary", "cache-01", "k8s-node-1", "auth-svc", "api-gw"];
const LOG_MSGS = {
  INFO: ["Connection established", "Health check passed", "Config reloaded", "Cache warmed", "TLS handshake OK", "Sync completed", "Replica in sync"],
  WARN: ["High memory usage detected", "Slow query: 2300ms", "Retry attempt 2/3", "Rate limit approaching", "Cert expires in 14d", "Queue depth elevated"],
  ERROR: ["Connection refused: db-primary:5432", "OOM killed PID 4821", "SSL cert validation failed", "Disk I/O timeout", "Heap overflow detected"],
  OK: ["Deployment complete", "Recovery successful", "Failover resolved", "Alert cleared", "Backup verified"],
};

const ANOMALIES = [
  { sev: "crit", title: "DDoS pattern — edge-01", body: "14,822 req/s burst. IPs: 185.220.101.x (TOR exit). Signature matches Mirai botnet. Confidence: 94%", tags: ["NETWORK", "CRITICAL", "AI-DETECTED"] },
  { sev: "warn", title: "Slow query cascade — db-primary", body: "SELECT * full table scan detected. 8 concurrent sessions blocked. P99 latency: 4.2s. Missing index on user_id FK.", tags: ["DATABASE", "PERFORMANCE"] },
  { sev: "warn", title: "Memory leak pattern — web-02", body: "Heap growth 2.3MB/hr. GC frequency increased 340%. Pattern matches connection pool leak. Uptime: 18h.", tags: ["MEMORY", "WEB"] },
  { sev: "info", title: "SSL cert expiry — cdn-edge-01", body: "Certificate CN=*.example.com expires in 13 days. Auto-renew is DISABLED. Action required.", tags: ["SECURITY", "EXPIRY"] },
];

const AI_INSIGHTS = [
  { type: "crit", title: "Cascading failure risk", body: "DDoS on edge-01 + db-primary saturation creates a cascading failure scenario. 78% probability in next 4h without intervention." },
  { type: "warn", title: "Anomalous access pattern", body: "User 4821 accessed 14 endpoints in 0.3s from 3 different geolocations. Possible credential stuffing." },
  { type: "ok", title: "Auto-scaling effective", body: "k8s-node-1..3 auto-scaled to handle 240% traffic spike. No SLA breach detected." },
  { type: "info", title: "Baseline model updated", body: "Retrained on 72h of data. New throughput baseline: 2.1 Gbps ± 18%. Sensitivity improved 12%." },
];

const CLUSTERS = [
  { name: "Infrastructure", count: 3, color: "#3b82f6" },
  { name: "Security", count: 2, color: "#ef4444" },
  { name: "Performance", count: 4, color: "#f59e0b" },
  { name: "Config drift", count: 1, color: "#8b5cf6" },
];

const RECS = [
  { icon: "⚡", text: "Enable rate limiting on edge-01 — block /24 subnet" },
  { icon: "🔍", text: "Add index: CREATE INDEX idx_user_id ON sessions(user_id)" },
  { icon: "🔄", text: "Rolling restart web-02 to clear memory leak" },
  { icon: "🔑", text: "Renew SSL cert for cdn-edge-01 immediately" },
  { icon: "📈", text: "Increase db-primary memory allocation to 32GB" },
];

const TOP_TALKERS = [
  { ip: "10.42.12.88", bytes: "4.2 GB", pct: 38 },
  { ip: "10.42.0.1", bytes: "2.1 GB", pct: 19 },
  { ip: "192.168.1.55", bytes: "1.8 GB", pct: 16 },
  { ip: "10.42.99.3", bytes: "1.1 GB", pct: 10 },
];

const GEO_DIST = [
  { c: "🇺🇸 United States", pct: 42 },
  { c: "🇩🇪 Germany", pct: 18 },
  { c: "🇯🇵 Japan", pct: 14 },
  { c: "🇬🇧 United Kingdom", pct: 11 },
  { c: "🇮🇳 India", pct: 9 },
  { c: "🇨🇦 Canada", pct: 6 },
];

// ── Styles (CSS-in-JS object) ──────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0c10; --bg2: #0f1117; --bg3: #151820; --bg4: #1c2030;
    --border: #ffffff12; --border2: #ffffff1f;
    --text: #e2e8f0; --text2: #94a3b8; --text3: #64748b;
    --green: #10b981; --red: #ef4444; --amber: #f59e0b;
    --blue: #3b82f6; --purple: #8b5cf6; --cyan: #06b6d4;
    --green2: #064e3b22; --red2: #450a0a44; --amber2: #451a0344; --blue2: #1e3a5f44;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }

  body { background: var(--bg); color: var(--text); font-size: 13px; }

  .app { display: flex; flex-direction: column; min-height: 100vh; }

  /* Topbar */
  .topbar { display: flex; align-items: center; gap: 14px; padding: 10px 20px;
    background: var(--bg2); border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 100; }
  .logo { display: flex; align-items: center; gap: 8px; font-size: 14px;
    font-weight: 700; letter-spacing: .06em; color: var(--cyan); }
  .pulse-dot { width: 8px; height: 8px; background: var(--green);
    border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
  .badge { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: .06em; }
  .badge-green { background: #06503322; color: var(--green); border: 1px solid #10b98133; }
  .badge-red { background: #450a0a22; color: var(--red); border: 1px solid #ef444433; }
  .badge-amber { background: #451a0322; color: var(--amber); border: 1px solid #f59e0b33; }
  .ml-auto { margin-left: auto; }
  .sys-time { color: var(--text3); font-size: 11px; font-variant-numeric: tabular-nums; }

  /* Nav */
  .nav { display: flex; gap: 2px; padding: 8px 20px;
    background: var(--bg2); border-bottom: 1px solid var(--border); }
  .nav-btn { padding: 6px 14px; border: none; background: none; color: var(--text3);
    font-size: 11px; font-weight: 600; border-radius: 6px; cursor: pointer;
    transition: all .15s; letter-spacing: .07em; font-family: inherit; }
  .nav-btn:hover { background: var(--bg3); color: var(--text); }
  .nav-btn.active { background: #1e3a5f; color: var(--blue); }

  /* Main */
  .main { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 12px; }

  /* Grids */
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-main { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
  .grid-main2 { display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; }
  @media(max-width:700px) {
    .grid-4,.grid-3,.grid-2,.grid-main,.grid-main2 { grid-template-columns: 1fr; }
  }

  /* Card */
  .card { background: var(--bg2); border: 1px solid var(--border);
    border-radius: 10px; padding: 14px; overflow: hidden; }
  .card-title { font-size: 10px; font-weight: 700; color: var(--text3);
    letter-spacing: .1em; text-transform: uppercase; margin-bottom: 10px;
    display: flex; align-items: center; gap: 6px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

  /* Metric */
  .metric-val { font-size: 26px; font-weight: 700; line-height: 1; }
  .metric-sub { font-size: 11px; color: var(--text3); margin-top: 4px; }
  .metric-delta { font-size: 11px; margin-top: 6px; }
  .delta-up { color: var(--green); } .delta-dn { color: var(--red); }

  /* Chart wrapper */
  .chart-wrap { position: relative; width: 100%; }
  .chart-wrap canvas { display: block; width: 100% !important; height: 100% !important; }

  /* Log */
  .log-wrap { overflow-y: auto; font-size: 11px; line-height: 1.9; }
  .log-wrap::-webkit-scrollbar { width: 3px; }
  .log-wrap::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
  .log-entry { padding: 1px 0; border-bottom: 1px solid var(--border);
    display: flex; gap: 8px; align-items: flex-start; }
  .log-ts { color: var(--text3); flex-shrink: 0; width: 78px; }
  .log-level { flex-shrink: 0; width: 46px; font-weight: 700; font-size: 10px; }
  .log-src { color: var(--cyan); flex-shrink: 0; width: 88px; overflow: hidden; text-overflow: ellipsis; }
  .log-msg { color: var(--text2); flex: 1; word-break: break-all; }
  .level-INFO { color: var(--blue); } .level-WARN { color: var(--amber); }
  .level-ERROR { color: var(--red); } .level-OK { color: var(--green); }

  /* Device table */
  .dev-table { width: 100%; border-collapse: collapse; }
  .dev-table th { font-size: 10px; color: var(--text3); text-align: left;
    padding: 4px 8px; border-bottom: 1px solid var(--border);
    font-weight: 600; letter-spacing: .06em; }
  .dev-table td { padding: 7px 8px; border-bottom: 1px solid var(--border);
    vertical-align: middle; font-size: 12px; }
  .dev-table tr:last-child td { border-bottom: none; }
  .dev-name { font-weight: 600; color: var(--text); }
  .dev-ip { color: var(--text3); font-size: 10px; }
  .status-dot-dev { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; }

  /* Bar */
  .bar-wrap { background: var(--bg4); border-radius: 4px; height: 4px; width: 80px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width .5s; }

  /* AI insight */
  .ai-insight { padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid; }
  .ai-insight-title { font-size: 11px; font-weight: 700; margin-bottom: 4px;
    display: flex; align-items: center; gap: 6px; }
  .ai-insight-body { font-size: 11px; color: var(--text2); line-height: 1.6; }
  .insight-crit { border-color: #ef444444; background: #450a0a22; }
  .insight-warn { border-color: #f59e0b44; background: #451a0322; }
  .insight-ok { border-color: #10b98144; background: #064e3b22; }
  .insight-info { border-color: #3b82f644; background: #1e3a5f22; }

  .tag { padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 700;
    margin: 2px; display: inline-block; letter-spacing: .05em; }
  .tag-CRITICAL, .tag-NETWORK { background: #450a0a; color: var(--red); }
  .tag-AIDETECTED { background: #1e3a5f; color: var(--blue); }
  .tag-DATABASE, .tag-PERFORMANCE, .tag-MEMORY, .tag-WEB { background: #451a03; color: var(--amber); }
  .tag-SECURITY, .tag-EXPIRY { background: #1e3a5f; color: var(--cyan); }

  /* Heatmap */
  .heatmap-grid { display: grid; grid-template-columns: repeat(14,1fr); gap: 3px; margin-top: 8px; }
  .heatmap-cell { height: 18px; border-radius: 3px; }

  /* Topology */
  .topo-wrap { position: relative; }
  .topo-wrap svg { width: 100%; height: 100%; }

  /* AI page */
  .ai-header { display: flex; align-items: center; gap: 12px; padding: 14px;
    background: var(--bg3); border-radius: 10px; border: 1px solid var(--border); margin-bottom: 12px; }
  .ai-brain { font-size: 22px; animation: blink 2.5s infinite; }
  @keyframes blink { 0%,90%,100%{opacity:1} 95%{opacity:.3} }
  .progress-wrap { background: var(--bg4); border-radius: 4px; height: 5px; overflow: hidden; margin-top: 8px; }
  .progress-bar { height: 100%; background: linear-gradient(90deg,var(--blue),var(--purple));
    border-radius: 4px; transition: width .4s; }

  /* Scan line */
  .scan-container { position: relative; overflow: hidden; }
  .scan-line { position: absolute; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg,transparent,var(--cyan),transparent);
    animation: scan 3s linear infinite; pointer-events: none; z-index: 1; }
  @keyframes scan { 0%{top:0} 100%{top:100%} }

  /* Misc */
  .flex-row { display: flex; align-items: center; gap: 8px; }
  .flex-between { display: flex; align-items: center; justify-content: space-between; }
  .text-muted { color: var(--text3); }
  .text-sm { font-size: 11px; }
  .text-xs { font-size: 10px; }
  .mt-1 { margin-top: 4px; }
  .mt-2 { margin-top: 8px; }
  .divider { border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 6px; }
`;

// ── Sub-components ─────────────────────────────────────────────────────────

function MiniSparkline({ data, color }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * H * 0.9 - H * 0.05;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [data, color]);
  return <canvas ref={canvasRef} width={120} height={36} style={{ width: "100%", height: 36 }} />;
}

function LiveChart({ inData, outData }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.offsetWidth || 400, H = canvas.offsetHeight || 160;
    canvas.width = W; canvas.height = H;
    const all = [...inData, ...outData];
    const max = Math.max(...all, 1);
    const drawLine = (data, color, fillColor) => {
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - (v / max) * H * 0.85 - H * 0.05;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = fillColor; ctx.fill();
    };
    ctx.clearRect(0, 0, W, H);
    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = H - (i / 4) * H * 0.9 - H * 0.05;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.strokeStyle = "#ffffff08"; ctx.lineWidth = 0.5; ctx.stroke();
    }
    drawLine(outData, "#10b981", "#10b98108");
    drawLine(inData, "#3b82f6", "#3b82f608");
  }, [inData, outData]);
  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}

function NetworkTopology() {
  const nodeMap = Object.fromEntries(TOPO_NODES.map(n => [n.id, n]));
  return (
    <svg viewBox="0 0 300 290" style={{ width: "100%", height: "100%" }}>
      {TOPO_EDGES.map(([a, b]) => {
        const na = nodeMap[a], nb = nodeMap[b];
        return <line key={`${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
          stroke="#ffffff18" strokeWidth="1.5" strokeDasharray="3 3" />;
      })}
      {TOPO_NODES.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.color + "22"} stroke={n.color} strokeWidth="1.5" />
          <text x={n.x} y={n.y + n.r + 11} textAnchor="middle"
            fill="#94a3b8" fontSize="8" fontFamily="monospace">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

function LogEntry({ entry }) {
  return (
    <div className="log-entry">
      <span className="log-ts">{entry.ts}</span>
      <span className={`log-level level-${entry.level}`}>{entry.level}</span>
      <span className="log-src">{entry.src}</span>
      <span className="log-msg">{entry.msg}</span>
    </div>
  );
}

function BarMeter({ value, width = 80 }) {
  const color = value > 80 ? "var(--red)" : value > 60 ? "var(--amber)" : "var(--green)";
  return (
    <div>
      <div className="bar-wrap" style={{ width }}>
        <div className="bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{value}%</div>
    </div>
  );
}

function StatusDot({ status }) {
  const colors = { online: "var(--green)", warn: "var(--amber)", offline: "var(--red)", err: "var(--red)", ok: "var(--green)" };
  return <span className="status-dot-dev" style={{ background: colors[status] || "var(--text3)" }} />;
}

// ── Page Components ────────────────────────────────────────────────────────

function OverviewPage({ inData, outData, logs, scanCount }) {
  const totalTput = ((inData[inData.length - 1] || 0) + (outData[outData.length - 1] || 0)) / 1000;
  return (
    <>
      <div className="grid-4">
        {[
          { label: "UPTIME", val: "99.94%", sub: "30-day rolling", delta: "▲ 0.02% vs last month", deltaType: "up", color: "var(--cyan)" },
          { label: "THROUGHPUT", val: `${totalTput.toFixed(2)} Gbps`, sub: "Inbound + outbound", delta: "▲ Live updating", deltaType: "up", color: "var(--blue)" },
          { label: "ALERTS", val: "2", sub: "Active warnings", delta: "▼ 1 critical unresolved", deltaType: "dn", color: "var(--amber)" },
          { label: "AI SCANS", val: String(scanCount), sub: "Anomalies detected today", delta: "▲ Model v3.2 active", deltaType: "up", color: "var(--purple)" },
        ].map(m => (
          <div key={m.label} className="card">
            <div className="card-title"><span className="dot" style={{ background: m.color }} />{m.label}</div>
            <div className="metric-val" style={{ color: m.color }}>{m.val}</div>
            <div className="metric-sub">{m.sub}</div>
            <div className={`metric-delta delta-${m.deltaType}`}>{m.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid-main">
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--blue)" }} />LIVE TRAFFIC — INBOUND / OUTBOUND (Mbps)
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 10 }}>
              <span style={{ color: "var(--blue)" }}>■ IN</span>
              <span style={{ color: "var(--green)" }}>■ OUT</span>
            </div>
          </div>
          <div className="chart-wrap" style={{ height: 180 }}>
            <LiveChart inData={inData} outData={outData} />
          </div>
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--green)" }} />NETWORK TOPOLOGY</div>
          <div className="topo-wrap" style={{ height: 270 }}><NetworkTopology /></div>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--red)" }} />TOP ALERTS</div>
          <div className="ai-insight insight-crit">
            <div className="ai-insight-title">⚠ DDoS Signature Detected</div>
            <div className="ai-insight-body">Node edge-01 — 14,822 req/s from 3 IPs. Traffic spiked 420% above baseline at 03:14 UTC.</div>
          </div>
          <div className="ai-insight insight-warn">
            <div className="ai-insight-title">△ CPU Saturation — db-primary</div>
            <div className="ai-insight-body">CPU at 94% for 8+ min. Query planner anomaly. Recommend index rebuild.</div>
          </div>
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--cyan)" }} />SERVICE HEALTH</div>
          {SERVICES.map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <StatusDot status={s.status} />
              <span style={{ flex: 1, color: "var(--text)", fontSize: 12 }}>{s.name}</span>
              <span style={{ color: "var(--text3)", fontSize: 11 }}>{s.latency}ms</span>
              <span style={{ fontSize: 10, color: s.uptime > 99 ? "var(--green)" : s.uptime > 95 ? "var(--amber)" : "var(--red)" }}>{s.uptime}%</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--purple)" }} />RECENT LOG EVENTS</div>
          <div className="log-wrap" style={{ height: 200 }}>
            {logs.slice(0, 30).map((e, i) => <LogEntry key={i} entry={e} />)}
          </div>
        </div>
      </div>
    </>
  );
}

function DevicesPage() {
  const heatmapCells = [];
  DEVICES.slice(0, 7).forEach(d => {
    for (let i = 0; i < 14; i++) {
      const v = Math.min(100, d.cpu + r(-20, 20));
      const bg = v > 80 ? "#ef444466" : v > 60 ? "#f59e0b55" : "#10b98155";
      heatmapCells.push({ bg, title: `${d.name}: ${v}%` });
    }
  });

  return (
    <>
      <div className="grid-2">
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--green)" }} />DEVICE INVENTORY</div>
          <table className="dev-table">
            <thead><tr><th>HOST</th><th>TYPE</th><th>CPU</th><th>MEM</th><th>STATUS</th></tr></thead>
            <tbody>
              {DEVICES.map(d => (
                <tr key={d.name}>
                  <td><div className="dev-name">{d.name}</div><div className="dev-ip">{d.ip}</div></td>
                  <td style={{ color: "var(--text2)", fontSize: 12 }}>{d.type}</td>
                  <td><BarMeter value={d.cpu} /></td>
                  <td><BarMeter value={d.mem} /></td>
                  <td><StatusDot status={d.status} /><span style={{ color: "var(--text2)", fontSize: 12 }}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--blue)" }} />RESOURCE UTILIZATION — CPU vs MEM</div>
          {DEVICES.map(d => (
            <div key={d.name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: "var(--text2)" }}>{d.name}</span>
                <span style={{ color: "var(--text3)" }}>CPU {d.cpu}% · MEM {d.mem}%</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <div className="bar-wrap" style={{ flex: 1 }}>
                  <div className="bar-fill" style={{ width: `${d.cpu}%`, background: d.cpu > 80 ? "var(--red)" : d.cpu > 60 ? "var(--amber)" : "var(--blue)" }} />
                </div>
                <div className="bar-wrap" style={{ flex: 1 }}>
                  <div className="bar-fill" style={{ width: `${d.mem}%`, background: d.mem > 80 ? "var(--red)" : d.mem > 60 ? "var(--amber)" : "var(--purple)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: "var(--amber)" }} />RESOURCE UTILIZATION HEATMAP — ROLLING 14 SAMPLES</div>
        <div className="heatmap-grid">
          {heatmapCells.map((c, i) => (
            <div key={i} className="heatmap-cell" style={{ background: c.bg }} title={c.title} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 10, color: "var(--text3)" }}>
          <span>◼ <span style={{ color: "var(--green)" }}>LOW</span></span>
          <span>◼ <span style={{ color: "var(--amber)" }}>MED</span></span>
          <span>◼ <span style={{ color: "var(--red)" }}>HIGH</span></span>
          <span style={{ marginLeft: "auto" }}>7 devices × 14 time slots</span>
        </div>
      </div>
    </>
  );
}

function TrafficPage({ inData, outData }) {
  return (
    <>
      <div className="grid-2">
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--blue)" }} />BANDWIDTH OVER TIME (Mbps)
            <span style={{ marginLeft: "auto", fontSize: 10, display: "flex", gap: 10 }}>
              <span style={{ color: "var(--blue)" }}>■ IN</span><span style={{ color: "var(--green)" }}>■ OUT</span>
            </span>
          </div>
          <div className="chart-wrap" style={{ height: 200 }}><LiveChart inData={inData} outData={outData} /></div>
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--purple)" }} />PROTOCOL DISTRIBUTION</div>
          {[
            { label: "HTTP/2", pct: 38, color: "var(--blue)" },
            { label: "HTTPS", pct: 29, color: "var(--green)" },
            { label: "gRPC", pct: 15, color: "var(--purple)" },
            { label: "DNS", pct: 8, color: "var(--amber)" },
            { label: "SSH", pct: 5, color: "var(--cyan)" },
            { label: "Other", pct: 5, color: "var(--text3)" },
          ].map(p => (
            <div key={p.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: "var(--text2)" }}>{p.label}</span>
                <span style={{ color: p.color, fontWeight: 700 }}>{p.pct}%</span>
              </div>
              <div className="bar-wrap" style={{ width: "100%" }}>
                <div className="bar-fill" style={{ width: `${p.pct}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid-3">
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--cyan)" }} />PACKET STATS</div>
          {[
            { k: "Packets/sec", v: "182,430" }, { k: "Dropped", v: "0.002%" },
            { k: "Avg RTT", v: "4.2 ms" }, { k: "Jitter", v: "0.8 ms" },
            { k: "TCP Retransmit", v: "0.12%" },
          ].map(i => (
            <div key={i.k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
              <span style={{ color: "var(--text3)" }}>{i.k}</span>
              <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{i.v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--green)" }} />TOP TALKERS</div>
          {TOP_TALKERS.map(t => (
            <div key={t.ip} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: "var(--text2)" }}>{t.ip}</span>
                <span style={{ color: "var(--text3)" }}>{t.bytes}</span>
              </div>
              <div className="bar-wrap" style={{ width: "100%" }}>
                <div className="bar-fill" style={{ width: `${t.pct}%`, background: "var(--blue)" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--amber)" }} />GEO DISTRIBUTION</div>
          {GEO_DIST.map(g => (
            <div key={g.c} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 11 }}>
              <span style={{ flex: 1, color: "var(--text2)" }}>{g.c}</span>
              <span style={{ color: "var(--text3)", width: 30, textAlign: "right" }}>{g.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function LogStreamPage({ logs, paused, onTogglePause, logCounts }) {
  const total = Object.values(logCounts).reduce((a, b) => a + b, 0) || 1;
  const levelColors = { INFO: "var(--blue)", WARN: "var(--amber)", ERROR: "var(--red)", OK: "var(--green)" };
  return (
    <div className="grid-main2">
      <div className="card">
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span><span className="dot" style={{ background: paused ? "var(--amber)" : "var(--green)", display: "inline-block", borderRadius: "50%", marginRight: 6 }} />LIVE LOG STREAM</span>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--text3)", cursor: "pointer" }}>
            <input type="checkbox" checked={paused} onChange={onTogglePause} style={{ accentColor: "var(--blue)" }} /> PAUSE
          </label>
        </div>
        <div className="log-wrap" style={{ height: 420 }}>
          {logs.slice(0, 200).map((e, i) => <LogEntry key={i} entry={e} />)}
        </div>
      </div>
      <div>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title"><span className="dot" style={{ background: "var(--blue)" }} />LOG VOLUME INDICATOR</div>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80 }}>
            {Array.from({ length: 20 }, (_, i) => {
              const h = r(20, 100);
              return <div key={i} style={{ flex: 1, height: `${h}%`, background: "#3b82f644", borderRadius: 2, borderTop: "1px solid #3b82f6" }} />;
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--amber)" }} />LEVEL BREAKDOWN</div>
          {Object.entries(logCounts).map(([l, c]) => (
            <div key={l} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: levelColors[l], fontWeight: 700 }}>{l}</span>
                <span style={{ color: "var(--text3)" }}>{c}</span>
              </div>
              <div className="bar-wrap" style={{ width: "100%" }}>
                <div className="bar-fill" style={{ width: `${Math.round(c / total * 100)}%`, background: levelColors[l] }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AIAnalysisPage({ scanCount, anomScores }) {
  const progWidth = 60 + (scanCount % 35);
  return (
    <>
      <div className="ai-header">
        <span className="ai-brain">⬡</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)" }}>AI LOG ANALYSIS ENGINE — MODEL v3.2</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Continuous pattern detection · Anomaly scoring · Root cause correlation</div>
          <div className="progress-wrap"><div className="progress-bar" style={{ width: `${progWidth}%` }} /></div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "var(--text2)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--purple)" }}>{scanCount}</div>
          <div style={{ color: "var(--text3)" }}>patterns found</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--red)" }} />ANOMALY FEED</div>
          <div className="scan-container">
            <div className="scan-line" />
            {ANOMALIES.map((a, i) => (
              <div key={i} className={`ai-insight insight-${a.sev === "crit" ? "crit" : a.sev === "warn" ? "warn" : "info"}`}>
                <div className="ai-insight-title">{a.sev === "crit" ? "⬡" : a.sev === "warn" ? "▲" : "◈"} {a.title}</div>
                <div className="ai-insight-body">{a.body}</div>
                <div style={{ marginTop: 6 }}>
                  {a.tags.map(t => (
                    <span key={t} className={`tag tag-${t.replace(/-/g, "")}`}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--purple)" }} />AI INSIGHTS</div>
          {AI_INSIGHTS.map((ins, i) => (
            <div key={i} className={`ai-insight insight-${ins.type}`}>
              <div className="ai-insight-title">{ins.title}</div>
              <div className="ai-insight-body">{ins.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--cyan)" }} />ANOMALY SCORE OVER TIME</div>
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 100 }}>
            {anomScores.map((v, i) => {
              const bg = v > 60 ? "var(--red)" : v > 30 ? "var(--amber)" : "var(--blue)";
              return <div key={i} style={{ flex: 1, height: `${v}%`, background: bg + "88", borderRadius: "2px 2px 0 0", borderTop: `1px solid ${bg}` }} />;
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
            <span>-30 min</span><span>now</span>
          </div>
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--amber)" }} />ROOT CAUSE CLUSTERS</div>
          {CLUSTERS.map(c => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0, display: "inline-block" }} />
              <span style={{ flex: 1, fontSize: 12 }}>{c.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.count}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title"><span className="dot" style={{ background: "var(--green)" }} />RECOMMENDATIONS</div>
          {RECS.map((rec, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text2)" }}>
              <span>{rec.icon}</span><span>{rec.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Root Component ─────────────────────────────────────────────────────────
export default function NetworkMonitor() {
  const [page, setPage] = useState("overview");
  const [time, setTime] = useState("");
  const [inData, setInData] = useState(() => Array.from({ length: MAX_PTS }, () => r(200, 900)));
  const [outData, setOutData] = useState(() => Array.from({ length: MAX_PTS }, () => r(100, 600)));
  const [anomScores, setAnomScores] = useState(() => Array.from({ length: MAX_PTS }, () => r(0, 60)));
  const [logs, setLogs] = useState([]);
  const [paused, setPaused] = useState(false);
  const [logCounts, setLogCounts] = useState({ INFO: 0, WARN: 0, ERROR: 0, OK: 0 });
  const [scanCount, setScanCount] = useState(0);

  // Seed logs
  useEffect(() => {
    const seed = [];
    for (let i = 0; i < 30; i++) seed.push(makeLog());
    setLogs(seed);
    const counts = { INFO: 0, WARN: 0, ERROR: 0, OK: 0 };
    seed.forEach(e => { counts[e.level] = (counts[e.level] || 0) + 1; });
    setLogCounts(counts);
  }, []);

  const makeLog = useCallback(() => {
    const level = Math.random() < 0.6 ? "INFO" : Math.random() < 0.5 ? "WARN" : Math.random() < 0.7 ? "ERROR" : "OK";
    const src = LOG_SOURCES[r(0, LOG_SOURCES.length)];
    const msg = LOG_MSGS[level][r(0, LOG_MSGS[level].length)];
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
    return { level, src, msg, ts };
  }, []);

  // Clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Log push
  useEffect(() => {
    const id = setInterval(() => {
      if (paused) return;
      const entry = makeLog();
      setLogs(prev => [entry, ...prev].slice(0, 300));
      setLogCounts(prev => ({ ...prev, [entry.level]: prev[entry.level] + 1 }));
    }, 800);
    return () => clearInterval(id);
  }, [paused, makeLog]);

  // Metrics update
  useEffect(() => {
    const id = setInterval(() => {
      const newIn = r(200, 900), newOut = r(100, 600);
      setInData(prev => [...prev.slice(1), newIn]);
      setOutData(prev => [...prev.slice(1), newOut]);
      setAnomScores(prev => [...prev.slice(1), r(0, 70)]);
      setScanCount(prev => prev + r(0, 3));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const PAGES = ["overview", "devices", "traffic", "logs", "ai"];
  const PAGE_LABELS = { overview: "OVERVIEW", devices: "DEVICES", traffic: "TRAFFIC", logs: "LOG STREAM", ai: "AI ANALYSIS" };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="topbar">
          <div className="logo"><span className="pulse-dot" />NETWATCH — AI MONITOR</div>
          <span className="badge badge-green">CLOUD SYNC ▲</span>
          <span className="badge badge-green">12 NODES ONLINE</span>
          <span className="badge badge-red">2 ALERTS</span>
          <div className="ml-auto">
            <span className="sys-time">{time}</span>
          </div>
        </div>

        <div className="nav">
          {PAGES.map(p => (
            <button key={p} className={`nav-btn${page === p ? " active" : ""}`} onClick={() => setPage(p)}>
              {PAGE_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="main">
          {page === "overview" && <OverviewPage inData={inData} outData={outData} logs={logs} scanCount={scanCount} />}
          {page === "devices" && <DevicesPage />}
          {page === "traffic" && <TrafficPage inData={inData} outData={outData} />}
          {page === "logs" && <LogStreamPage logs={logs} paused={paused} onTogglePause={() => setPaused(p => !p)} logCounts={logCounts} />}
          {page === "ai" && <AIAnalysisPage scanCount={scanCount} anomScores={anomScores} />}
        </div>
      </div>
    </>
  );
}
