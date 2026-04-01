import { useEffect, useMemo, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const G = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{min-height:100%}
body{
  background:var(--bg);
  color:var(--text);
  font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  min-height:100vh;
  transition:background .2s,color .2s;
}
:root{
  --bg:#060b16;
  --surf:#0c1425;
  --panel:#101b30;
  --bdr:rgba(255,255,255,0.07);
  --teal:#00d4aa;
  --tdim:rgba(0,212,170,0.12);
  --tglow:rgba(0,212,170,0.35);
  --amber:#f59e0b;
  --red:#ef4444;
  --muted:#64748b;
  --text:#e2e8f0;
}
body[data-theme="light"]{
  --bg:#eef4fb;
  --surf:#ffffff;
  --panel:#f6f9fc;
  --bdr:rgba(15,23,42,0.08);
  --teal:#0f766e;
  --tdim:rgba(15,118,110,0.10);
  --tglow:rgba(15,118,110,0.18);
  --amber:#d97706;
  --red:#dc2626;
  --muted:#64748b;
  --text:#0f172a;
}
body::before{
  content:'';
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:0;
  background-image:
    linear-gradient(rgba(0,212,170,0.018) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,212,170,0.018) 1px,transparent 1px);
  background-size:40px 40px
}
body[data-theme="light"]::before{
  background-image:
    linear-gradient(rgba(15,118,110,0.035) 1px,transparent 1px),
    linear-gradient(90deg,rgba(15,118,110,0.035) 1px,transparent 1px);
}
@keyframes pe{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}50%{box-shadow:0 0 10px 3px rgba(239,68,68,0.35)}}
@keyframes pd{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes gp{0%,100%{text-shadow:0 0 20px rgba(0,212,170,0.5)}50%{text-shadow:0 0 40px rgba(0,212,170,0.9)}}
@keyframes sp{to{transform:rotate(360deg)}}
@keyframes mi{from{opacity:0;transform:scale(.96) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
.pa{animation:fi .25s ease}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:999px}
input,select,textarea{font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
button{cursor:pointer;font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
input:focus,select:focus,textarea:focus{outline:none}
`;

const SC = {
  Waiting: { bg:"rgba(59,130,246,.12)", c:"#60a5fa", b:"rgba(59,130,246,.3)", d:"#60a5fa", a:false },
  Treatment: { bg:"rgba(16,185,129,.12)", c:"#34d399", b:"rgba(16,185,129,.3)", d:"#34d399", a:false },
  Critical: { bg:"rgba(239,68,68,.12)", c:"#f87171", b:"rgba(239,68,68,.3)", d:"#f87171", a:false },
  Emergency: { bg:"rgba(239,68,68,.18)", c:"#fca5a5", b:"rgba(239,68,68,.5)", d:"#f87171", a:true },
  Complete: { bg:"rgba(100,116,139,.15)", c:"#94a3b8", b:"rgba(100,116,139,.3)", d:"#94a3b8", a:false },
  Completed: { bg:"rgba(100,116,139,.15)", c:"#94a3b8", b:"rgba(100,116,139,.3)", d:"#94a3b8", a:false },
  Urgent: { bg:"rgba(239,68,68,.15)", c:"#fca5a5", b:"rgba(239,68,68,.4)", d:"#f87171", a:true },
  Next: { bg:"rgba(16,185,129,.12)", c:"#34d399", b:"rgba(16,185,129,.3)", d:"#34d399", a:false },
  "Be prepared": { bg:"rgba(245,158,11,.12)", c:"#fbbf24", b:"rgba(245,158,11,.25)", d:"#f59e0b", a:false },
};

function Pill({ status }) {
  const normalizedStatus = status === "Next" ? "Treatment" : status;
  const label = status === "Next" ? "Getting Treated" : status;
  const s = SC[normalizedStatus] || SC.Waiting;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 999,
        background: s.bg,
        color: s.c,
        border: `1px solid ${s.b}`,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
        whiteSpace: "nowrap",
        animation: s.a ? "pe 1.8s ease-in-out infinite" : "none",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.d,
          flexShrink: 0,
          animation: s.a ? "pd 1.8s ease-in-out infinite" : "none",
        }}
      />
      {label}
    </span>
  );
}
function Av({ name="?", size="md" }) {
  const ini = (name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const dim = size === "lg" ? 52 : size === "sm" ? 30 : 38;
  const fs = size === "lg" ? 17 : size === "sm" ? 11 : 13;
  return (
    <div style={{
      width:dim, height:dim, borderRadius:size === "lg" ? 14 : 10, flexShrink:0,
      background:"linear-gradient(135deg,#00d4aa,#3b82f6)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:fs, color:"#000"
    }}>
      {ini}
    </div>
  );
}

function Lbl({ children }) {
  return (
    <div style={{
      fontFamily:"Inter, sans-serif", fontSize:10, letterSpacing:"2px",
      color:"#64748b", textTransform:"uppercase", marginBottom:8
    }}>
      {children}
    </div>
  );
}

function Spin({ size=20 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      border:"2px solid rgba(0,212,170,.3)", borderTopColor:"var(--teal)",
      animation:"sp .7s linear infinite", flexShrink:0
    }}/>
  );
}

const I = {
  Grid: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Wave: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  User: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Bed: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  Search: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Bell: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Cog: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Warn: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Users: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Clock: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Gauge: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  Plus: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Logout: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  X: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Lock: <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Mail: <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Eye: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
};

const NAV = [
  { key:"dashboard", label:"Dashboard", icon:I.Grid },
  { key:"triage", label:"Triage Monitor", icon:I.Wave },
  { key:"portal", label:"Patient Portal", icon:I.User },
  { key:"rooms", label:"Room Overview", icon:I.Bed },
];

const IS = {
  width:"100%", background:"var(--panel)", border:"1px solid var(--bdr)",
  borderRadius:10, padding:"11px 14px", color:"var(--text)", fontSize:14,
  transition:"border-color .2s",
};

const LS = {
  display:"block", fontFamily:"Inter, sans-serif", fontSize:10,
  letterSpacing:"2px", color:"#64748b", textTransform:"uppercase", marginBottom:8,
};

const fo = (e) => { e.target.style.borderColor = "var(--teal)"; };
const bl = (e) => { e.target.style.borderColor = "var(--bdr)"; };

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between", gap:16,
      padding:"12px 0", borderBottom:"1px solid var(--bdr)"
    }}>
      <div>
        <div style={{ fontSize:14, fontWeight:600 }}>{label}</div>
        {desc && <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{desc}</div>}
      </div>
      <button
        type="button"
        onClick={onChange}
        style={{
          width:50, height:28, borderRadius:999, border:"1px solid var(--bdr)",
          background:checked ? "var(--teal)" : "rgba(255,255,255,.08)",
          position:"relative", transition:"all .2s"
        }}
      >
        <span
          style={{
            position:"absolute", top:3, left:checked ? 25 : 3,
            width:20, height:20, borderRadius:"50%",
            background:checked ? "#000" : "#fff", transition:"all .2s"
          }}
        />
      </button>
    </div>
  );
}

function NotificationsDropdown({ notifications, onClose }) {
  return (
    <div style={{
      position:"absolute", top:"calc(100% + 10px)", right:0, width:320,
      background:"var(--surf)", border:"1px solid var(--bdr)", borderRadius:14,
      boxShadow:"0 18px 40px rgba(0,0,0,.28)", overflow:"hidden", zIndex:120
    }}>
      <div style={{
        padding:"14px 16px", borderBottom:"1px solid var(--bdr)",
        display:"flex", alignItems:"center", justifyContent:"space-between"
      }}>
        <div style={{ fontWeight:700 }}>Notifications</div>
        <button
          onClick={onClose}
          style={{ background:"none", border:"none", color:"#64748b", fontSize:12 }}
        >
          Close
        </button>
      </div>

      <div style={{ maxHeight:320, overflowY:"auto" }}>
        {notifications.length === 0 ? (
          <div style={{ padding:16, color:"#64748b", fontSize:13 }}>
            No new alerts.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{ padding:"14px 16px", borderBottom:"1px solid var(--bdr)" }}
            >
              <div style={{ fontSize:13, fontWeight:700, color:n.color }}>
                {n.title}
              </div>
              <div style={{ fontSize:13, color:"var(--text)", marginTop:5 }}>
                {n.message}
              </div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:6 }}>
                {n.time}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsModal({
  open,
  onClose,
  theme,
  setTheme,
  compactMode,
  setCompactMode,
  soundAlerts,
  setSoundAlerts,
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:140,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:"100%", maxWidth:460, background:"var(--surf)", border:"1px solid var(--bdr)",
          borderRadius:18, padding:22, boxShadow:"0 18px 50px rgba(0,0,0,.28)"
        }}
      >
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8
        }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700 }}>Settings</div>
            <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>
              Basic dashboard preferences
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background:"rgba(255,255,255,.06)", border:"1px solid var(--bdr)",
              color:"var(--text)", borderRadius:10, padding:"8px 10px"
            }}
          >
            Close
          </button>
        </div>

        <div style={{ marginTop:10 }}>
          <ToggleRow
            label="Dark Mode"
            desc="Switch between dark and light appearance"
            checked={theme === "dark"}
            onChange={() => setTheme(theme === "dark" ? "light" : "dark")}
          />

          <ToggleRow
            label="Compact Mode"
            desc="Use slightly tighter spacing in dashboard cards"
            checked={compactMode}
            onChange={() => setCompactMode((v) => !v)}
          />

          <ToggleRow
            label="Sound Alerts"
            desc="Enable basic sound alerts for emergency arrivals"
            checked={soundAlerts}
            onChange={() => setSoundAlerts((v) => !v)}
          />
        </div>
      </div>
    </div>
  );
}

function EntryChoice({ onChoose }) {
  return (
    <div
      style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        position:"relative", zIndex:1, padding:24
      }}
    >
      <div style={{ width:"100%", maxWidth:900 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:14, marginBottom:14 }}>
            <div
              style={{
                width:58, height:58, borderRadius:12, border:"3px solid var(--teal)",
                display:"flex", alignItems:"center", justifyContent:"center"
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                <polyline points="5,12 9,12 11,8 14,16 16,12 19,12"></polyline>
              </svg>
            </div>

            <div
              style={{
                fontFamily:"Inter, sans-serif", fontSize:34, fontWeight:700,
                letterSpacing:"-1px", color:"var(--teal)", lineHeight:1
              }}
            >
              PulseQueue
            </div>
          </div>

          <div
            style={{
              fontSize:15, color:"#94a3b8", maxWidth:560, margin:"0 auto", lineHeight:1.7
            }}
          >
            Choose how you want to enter the system.
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <button
            onClick={() => onChoose("patient")}
            style={{
              background:"var(--surf)", border:"1px solid var(--bdr)", borderRadius:20,
              padding:28, textAlign:"left", color:"var(--text)"
            }}
          >
            <div style={{ fontSize:24, fontWeight:700, marginBottom:10, color:"var(--teal)" }}>
              I am a Patient
            </div>
            <div style={{ color:"#94a3b8", fontSize:14, lineHeight:1.7 }}>
              No account needed. View public queue information like total waiting patients,
              average wait time, and estimated waiting time ranges.
            </div>
          </button>

          <button
            onClick={() => onChoose("staff")}
            style={{
              background:"var(--surf)", border:"1px solid var(--bdr)", borderRadius:20,
              padding:28, textAlign:"left", color:"var(--text)"
            }}
          >
            <div style={{ fontSize:24, fontWeight:700, marginBottom:10, color:"var(--teal)" }}>
              I am Staff
            </div>
            <div style={{ color:"#94a3b8", fontSize:14, lineHeight:1.7 }}>
              Staff members can sign in or create an account to manage patients,
              update triage status, and control the live queue.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onBack }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !pw) {
      setErr("Please enter email and password.");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), pw);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), pw);
      }
    } catch (ex) {
      const m = {
        "auth/user-not-found":"No account found for this email.",
        "auth/wrong-password":"Incorrect password.",
        "auth/invalid-email":"Enter a valid email address.",
        "auth/email-already-in-use":"This email is already registered.",
        "auth/weak-password":"Password should be at least 6 characters.",
        "auth/too-many-requests":"Too many attempts. Please wait and try again.",
        "auth/invalid-credential":"Invalid email or password.",
      };
      setErr(m[ex.code] || "Authentication failed.");
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        position:"relative", zIndex:1
      }}
    >
      <div style={{ width:"100%", maxWidth:420, padding:24 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div
            style={{
              display:"flex", justifyContent:"center", alignItems:"center", gap:14, marginBottom:14
            }}
          >
            <div
              style={{
                width:58, height:58, borderRadius:12, border:"3px solid var(--teal)",
                display:"flex", alignItems:"center", justifyContent:"center"
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                <polyline points="5,12 9,12 11,8 14,16 16,12 19,12"></polyline>
              </svg>
            </div>

            <div
              style={{
                fontFamily:"Inter, sans-serif", fontSize:30, fontWeight:700,
                letterSpacing:"-1px", color:"var(--teal)", lineHeight:1
              }}
            >
              PulseQueue
            </div>
          </div>

          <div
            style={{
              fontFamily:"Inter, sans-serif", fontSize:10, color:"var(--teal)",
              letterSpacing:"3px", marginTop:4
            }}
          >
            STAFF ACCESS PORTAL
          </div>
        </div>

        <div
          style={{
            background:"var(--surf)", border:"1px solid var(--bdr)", borderRadius:20,
            padding:32, animation:"fi .3s ease"
          }}
        >
          <div style={{ display:"flex", gap:8, marginBottom:18 }}>
            <button
              type="button"
              onClick={() => setMode("signin")}
              style={{
                flex:1, padding:"10px 14px", borderRadius:10, border:"1px solid var(--bdr)",
                background:mode === "signin" ? "var(--teal)" : "rgba(255,255,255,.04)",
                color:mode === "signin" ? "#000" : "var(--text)", fontWeight:600
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{
                flex:1, padding:"10px 14px", borderRadius:10, border:"1px solid var(--bdr)",
                background:mode === "signup" ? "var(--teal)" : "rgba(255,255,255,.04)",
                color:mode === "signup" ? "#000" : "var(--text)", fontWeight:600
              }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={submit}>
            <div style={{ marginBottom:18 }}>
              <label style={LS}>Staff Email</label>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"#64748b" }}>
                  {I.Mail}
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.com"
                  style={{ ...IS, paddingLeft:42 }}
                  onFocus={fo}
                  onBlur={bl}
                />
              </div>
            </div>

            <div style={{ marginBottom:22 }}>
              <label style={LS}>Password</label>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"#64748b" }}>
                  {I.Lock}
                </div>
                <input
                  type={show ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...IS, paddingLeft:42, paddingRight:42 }}
                  onFocus={fo}
                  onBlur={bl}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  style={{
                    position:"absolute", right:13, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", color:"#64748b", padding:0, display:"flex"
                  }}
                >
                  {show ? I.EyeOff : I.Eye}
                </button>
              </div>
            </div>

            {err && (
              <div
                style={{
                  background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
                  borderRadius:10, padding:"10px 14px", fontSize:13, color:"#f87171",
                  marginBottom:18, display:"flex", alignItems:"center", gap:8
                }}
              >
                {I.Warn}{err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                width:"100%", background:"var(--teal)", color:"#000", border:"none",
                padding:"13px", borderRadius:10, fontWeight:700, fontSize:15,
                fontFamily:"Inter, sans-serif", display:"flex", alignItems:"center",
                justifyContent:"center", gap:10, boxShadow:"0 0 20px var(--tglow)",
                opacity:busy ? 0.7 : 1, transition:"opacity .2s"
              }}
            >
              {busy
                ? <><Spin size={18}/>{mode === "signup" ? "Creating account…" : "Signing in…"}</>
                : mode === "signup" ? "Create Staff Account" : "Sign In to Dashboard"}
            </button>
          </form>

          <button
            type="button"
            onClick={onBack}
            style={{
              marginTop:14, width:"100%", background:"rgba(255,255,255,.04)",
              border:"1px solid var(--bdr)", color:"var(--text)", padding:"11px",
              borderRadius:10, fontWeight:600
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

const BLANK = { name:"", age:"", condition:"", priority:"2", room:"", nurse:"", notes:"" };

function PatientModal({ open, onClose, initial }) {
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef();

  useEffect(() => {
    if (open) {
      if (initial) {
        setF({
          name: initial.name || "",
          age: initial.age || "",
          condition: initial.condition || "",
          priority: String(initial.priority || 2),
          room: initial.room || "",
          nurse: initial.nurse || "",
          notes: initial.notes || "",
        });
      } else {
        setF(BLANK);
      }
      setErr("");
    }
  }, [open, initial]);

  if (!open) return null;

  const fld = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();

    if (!f.name.trim()) {
      setErr("Full name is required.");
      return;
    }
    if (!f.age || isNaN(+f.age) || +f.age < 0 || +f.age > 130) {
      setErr("Enter a valid age (0–130).");
      return;
    }
    if (!f.condition.trim()) {
      setErr("Condition / complaint is required.");
      return;
    }
    if (!f.room.trim()) {
      setErr("Room assignment is required.");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const pri = Math.max(1, Math.min(5, parseInt(f.priority, 10) || 2));

      if (initial) {
        await updateDoc(doc(db, "patients", initial.firestoreId), {
          name: f.name.trim(),
          age: parseInt(f.age, 10),
          condition: f.condition.trim(),
          priority: pri,
          room: f.room.trim().toUpperCase(),
          nurse: f.nurse.trim() || "Unassigned",
          notes: f.notes.trim(),
          lastUpdate: "Patient details updated by staff.",
        });
      } else {
        await addDoc(collection(db, "patients"), {
          name: f.name.trim(),
          age: parseInt(f.age, 10),
          condition: f.condition.trim(),
          priority: pri,
          room: f.room.trim().toUpperCase(),
          nurse: f.nurse.trim() || "Unassigned",
          notes: f.notes.trim(),
          status: pri >= 5 ? "Emergency" : "Waiting",
          waitMinutes: pri >= 5 ? 2 : pri === 4 ? 8 : pri === 3 ? 15 : pri === 2 ? 25 : 35,
          portalStatus: pri >= 5 ? "Urgent" : "Waiting",
          fairnessNote: "You have been added to the queue. Your wait time updates shortly.",
          lastUpdate: "Patient registered and added to queue by staff.",
          timeline: ["Checked in by staff"],
          createdAt: serverTimestamp(),
        });
      }

      setBusy(false);
      onClose();
    } catch (ex) {
      console.error(ex);
      setErr("Failed to save. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div
      ref={ref}
      onClick={(e) => e.target === ref.current && onClose()}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.75)",
        backdropFilter:"blur(4px)", zIndex:1000,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20
      }}
    >
      <div style={{
        background:"var(--surf)", border:"1px solid var(--bdr)", borderRadius:20,
        width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto", animation:"mi .25s ease"
      }}>
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"22px 24px", borderBottom:"1px solid var(--bdr)"
        }}>
          <div>
            <div style={{ fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:18 }}>
              {initial ? "Edit Patient" : "Add New Patient"}
            </div>
            <div style={{ fontSize:13, color:"#64748b", marginTop:3 }}>
              {initial ? "Update patient details in Firestore" : "Register and place patient in the live queue"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background:"rgba(255,255,255,.07)", border:"none", color:"var(--text)",
              width:36, height:36, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center"
            }}
          >
            {I.X}
          </button>
        </div>

        <form onSubmit={submit} style={{ padding:24 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div style={{ gridColumn:"span 2" }}>
              <label style={LS}>Full Name *</label>
              <input value={f.name} onChange={fld("name")} placeholder="John Smith" style={IS} onFocus={fo} onBlur={bl}/>
            </div>

            <div>
              <label style={LS}>Age *</label>
              <input type="number" min="0" max="130" value={f.age} onChange={fld("age")} placeholder="42" style={IS} onFocus={fo} onBlur={bl}/>
            </div>

            <div>
              <label style={LS}>Priority Level *</label>
              <select value={f.priority} onChange={fld("priority")} style={{ ...IS, appearance:"none" }} onFocus={fo} onBlur={bl}>
                <option value="1">1 — Routine</option>
                <option value="2">2 — Low</option>
                <option value="3">3 — Moderate</option>
                <option value="4">4 — High</option>
                <option value="5">5 — Emergency</option>
              </select>
            </div>

            <div style={{ gridColumn:"span 2" }}>
              <label style={LS}>Chief Complaint / Condition *</label>
              <input value={f.condition} onChange={fld("condition")} placeholder="Chest pain, laceration, flu symptoms…" style={IS} onFocus={fo} onBlur={bl}/>
            </div>

            <div>
              <label style={LS}>Room *</label>
              <input value={f.room} onChange={fld("room")} placeholder="ER-01" style={IS} onFocus={fo} onBlur={bl}/>
            </div>

            <div>
              <label style={LS}>Nurse / Clinician</label>
              <input value={f.nurse} onChange={fld("nurse")} placeholder="Dr. Name" style={IS} onFocus={fo} onBlur={bl}/>
            </div>

            <div style={{ gridColumn:"span 2" }}>
              <label style={LS}>Intake Notes</label>
              <textarea value={f.notes} onChange={fld("notes")} rows={3} placeholder="Any additional observations…" style={{ ...IS, resize:"vertical", lineHeight:1.5 }} onFocus={fo} onBlur={bl}/>
            </div>
          </div>

          <div style={{
            background:"var(--panel)", borderRadius:10, padding:"10px 14px",
            marginBottom:14, display:"flex", alignItems:"center", gap:12, fontSize:13
          }}>
            <span style={{ color:"#64748b" }}>Admission status:</span>
            <Pill status={parseInt(f.priority, 10) >= 5 ? "Emergency" : "Waiting"}/>
          </div>

          {err && (
            <div style={{
              background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
              borderRadius:10, padding:"10px 14px", fontSize:13, color:"#f87171",
              marginBottom:14, display:"flex", alignItems:"center", gap:8
            }}>
              {I.Warn}{err}
            </div>
          )}

          <div style={{ display:"flex", gap:10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex:1, background:"rgba(255,255,255,.06)", border:"1px solid var(--bdr)",
                color:"var(--text)", padding:"12px", borderRadius:10, fontWeight:600, fontSize:14
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                flex:2, background:"var(--teal)", color:"#000", border:"none",
                padding:"12px", borderRadius:10, fontWeight:700, fontSize:14,
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                boxShadow:"0 0 16px var(--tglow)", opacity:busy ? 0.7 : 1
              }}
            >
              {busy ? <><Spin size={16}/>{initial ? "Saving…" : "Adding…"}</> : <>{I.Plus}{initial ? "Save Changes" : "Add to Queue"}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardPage({
  patients,
  selectedId,
  setSelectedId,
  sortMode,
  setSortMode,
  onAdvance,
  onBump,
  onAdd,
  onEdit,
  compactMode,
}) {
  const isDone = (p) => ["Complete", "Completed"].includes(p.status);
  const activePatients = useMemo(
    () => patients.filter((p) => !isDone(p)),
    [patients]
  );

  const metrics = useMemo(() => {
    if (!patients.length) {
      return {
        totalWaiting: 0,
        avgWait: 0,
        nextPatient: null,
        queueStatus: "Low Load",
        queueStatusColor: "var(--teal)",
        queueStatusBg: "var(--tdim)",
        queueStatusBorder: "rgba(0,212,170,.2)",
        emergencyCount: 0,
      };
    }

    const totalWaiting = activePatients.filter((p) =>
      ["Waiting", "Emergency", "Treatment"].includes(p.status)
    ).length;

    const avgWait = activePatients.length
      ? Math.round(
          activePatients.reduce((a, p) => a + (p.waitMinutes || 0), 0) /
            activePatients.length
        )
      : 0;

    const emergencyCount = activePatients.filter(
      (p) => p.status === "Emergency" || p.status === "Critical"
    ).length;

    const nextPatient =
      [...activePatients].sort((a, b) => {
        const aEmergency = a.status === "Emergency" ? 1 : 0;
        const bEmergency = b.status === "Emergency" ? 1 : 0;
        return (
          bEmergency - aEmergency ||
          (b.priority || 0) - (a.priority || 0) ||
          (a.waitMinutes || 0) - (b.waitMinutes || 0)
        );
      })[0] || null;

    let queueStatus = "Low Load";
    let queueStatusColor = "var(--teal)";
    let queueStatusBg = "var(--tdim)";
    let queueStatusBorder = "rgba(0,212,170,.2)";

    if (emergencyCount >= 2 || totalWaiting >= 8) {
      queueStatus = "High Pressure";
      queueStatusColor = "#f87171";
      queueStatusBg = "rgba(239,68,68,.12)";
      queueStatusBorder = "rgba(239,68,68,.25)";
    } else if (totalWaiting >= 4 || avgWait >= 15) {
      queueStatus = "Moderate Load";
      queueStatusColor = "#fbbf24";
      queueStatusBg = "rgba(245,158,11,.12)";
      queueStatusBorder = "rgba(245,158,11,.25)";
    }

    return {
      totalWaiting,
      avgWait,
      nextPatient,
      queueStatus,
      queueStatusColor,
      queueStatusBg,
      queueStatusBorder,
      emergencyCount,
    };
  }, [patients, activePatients]);

  const pq = useMemo(() => {
    return [...activePatients]
      .filter((p) => (p.priority || 0) >= 4 || p.status === "Emergency")
      .sort(
        (a, b) =>
          (b.priority || 0) - (a.priority || 0) ||
          (a.waitMinutes || 0) - (b.waitMinutes || 0)
      )
      .slice(0, 2);
  }, [activePatients]);

  const sorted = useMemo(() => {
    const cp = [...patients];

    cp.sort((a, b) => {
      const aDone = isDone(a);
      const bDone = isDone(b);

      if (aDone !== bDone) return aDone ? 1 : -1;

      if (sortMode === "Wait Time") {
        return (b.waitMinutes || 0) - (a.waitMinutes || 0);
      }

      if (sortMode === "Priority") {
        return (
          (b.priority || 0) - (a.priority || 0) ||
          (b.waitMinutes || 0) - (a.waitMinutes || 0)
        );
      }

      const aSec = a.createdAt?.seconds || 0;
      const bSec = b.createdAt?.seconds || 0;
      return bSec - aSec;
    });

    return cp;
  }, [patients, sortMode]);

  const metricCards = [
    {
      key: "waiting",
      icon: I.Users,
      label: "Waiting Patients",
      val: metrics.totalWaiting,
      ac: "var(--teal)",
      bg: "var(--tdim)",
      sub: `${metrics.emergencyCount} emergency / critical`,
    },
    {
      key: "avg",
      icon: I.Clock,
      label: "Avg. Wait Time",
      val: `${metrics.avgWait} min`,
      ac: "#60a5fa",
      bg: "rgba(59,130,246,.12)",
      sub: "Active queue only",
    },
  ];

  return (
    <div className="pa">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            Staff Dashboard
          </h2>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
            Real-time emergency department queue
          </p>
        </div>

        <button
          onClick={onAdd}
          style={{
            background: "var(--teal)",
            color: "#000",
            border: "none",
            padding: "11px 22px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 0 16px var(--tglow)",
          }}
        >
          {I.Plus} New Intake
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
          padding: "10px 14px",
          background: "rgba(255,255,255,.03)",
          border: "1px solid var(--bdr)",
          borderRadius: 12,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: metrics.queueStatusColor,
            boxShadow: `0 0 14px ${metrics.queueStatusColor}`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          Queue Status:{" "}
          <span style={{ color: metrics.queueStatusColor }}>
            {metrics.queueStatus}
          </span>
        </span>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Live operational overview
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {metricCards.map((m) => (
          <div
            key={m.key}
            style={{
              background: "var(--surf)",
              border: "1px solid var(--bdr)",
              borderRadius: 16,
              padding: compactMode ? 18 : 24,
              minHeight: compactMode ? 160 : 190,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: m.bg,
                color: m.ac,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              {m.icon}
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: -1.5,
              }}
            >
              {m.val}
            </div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              {m.label}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 10 }}>
              {m.sub}
            </div>
          </div>
        ))}

        <div
          style={{
            background: "var(--surf)",
            border: "1px solid var(--bdr)",
            borderRadius: 16,
            padding: compactMode ? 18 : 24,
            minHeight: compactMode ? 160 : 190,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(16,185,129,.12)",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            {I.Grid}
          </div>

          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
            Next Patient
          </div>

          {metrics.nextPatient ? (
            <>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  marginBottom: 6,
                }}
              >
                {metrics.nextPatient.name}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>
                {metrics.nextPatient.room || "—"} ·{" "}
                {metrics.nextPatient.condition || "No condition listed"}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <Pill status={metrics.nextPatient.status} />
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.06)",
                    color: "#cbd5e1",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {(metrics.nextPatient.waitMinutes || 0)} min
                </span>
              </div>
              <button
                onClick={() => setSelectedId(metrics.nextPatient.firestoreId)}
                style={{
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid var(--bdr)",
                  color: "var(--text)",
                  padding: "9px 14px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                View Patient
              </button>
            </>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>
              No active patient in queue
            </div>
          )}
        </div>

        <div
          style={{
            background: "var(--surf)",
            border: `1px solid ${metrics.queueStatusBorder}`,
            borderRadius: 16,
            padding: compactMode ? 18 : 24,
            minHeight: compactMode ? 160 : 190,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: metrics.queueStatusBg,
              color: metrics.queueStatusColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            {I.Warn}
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: metrics.queueStatusColor,
              marginBottom: 6,
            }}
          >
            {metrics.queueStatus}
          </div>
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>
            Queue Health
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
              <span>Waiting now</span>
              <strong style={{ color: "var(--text)" }}>{metrics.totalWaiting}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
              <span>Average wait</span>
              <strong style={{ color: "var(--text)" }}>{metrics.avgWait} min</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
              <span>Emergency count</span>
              <strong style={{ color: "var(--text)" }}>{metrics.emergencyCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {pq.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 15,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--amber)",
              }}
            >
              {I.Warn} High Priority Patients
            </span>
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              Immediate attention recommended
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {pq.map((p) => (
              <div
                key={p.firestoreId}
                style={{
                  background:
                    selectedId === p.firestoreId
                      ? "rgba(245,158,11,.07)"
                      : "var(--surf)",
                  border: `1px solid ${
                    selectedId === p.firestoreId
                      ? "rgba(245,158,11,.5)"
                      : "var(--bdr)"
                  }`,
                  borderRadius: 16,
                  padding: 20,
                  transition: "all .2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Av name={p.name} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        {p.room} · {p.condition}
                      </div>
                    </div>
                  </div>
                  <Pill status={p.status} />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <BtnSm onClick={() => setSelectedId(p.firestoreId)}>View</BtnSm>
                  <BtnSm v="bump" onClick={() => onBump(p.firestoreId)}>Bump</BtnSm>
                  <BtnSm v="adv" onClick={() => onAdvance(p.firestoreId)}>Advance</BtnSm>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          background: "var(--surf)",
          border: "1px solid var(--bdr)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--bdr)",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                display: "block",
              }}
            >
              All Active Patients (
              {patients.filter((p) => !["Complete", "Completed"].includes(p.status)).length}
              )
            </span>
            <span style={{ color: "#64748b", fontSize: 12 }}>
              Live queue with completed patients pinned below
            </span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {["Recent Activity", "Wait Time", "Priority"].map((m) => (
              <button
                key={m}
                onClick={() => setSortMode(m)}
                style={{
                  background: sortMode === m ? "#e2e8f0" : "none",
                  color: sortMode === m ? "#000" : "#64748b",
                  border: "1px solid var(--bdr)",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: sortMode === m ? 600 : 400,
                  transition: "all .2s",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
                {["Patient", "Room", "Wait", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 10,
                      letterSpacing: "2px",
                      color: "#64748b",
                      fontWeight: 400,
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sorted.map((p) => {
                const pct = Math.min(100, (p.waitMinutes || 0) * 1.6);
                const bc = (p.waitMinutes || 0) > 40 ? "#ef4444" : "var(--teal)";
                const done = isDone(p);

                return (
                  <tr
                    key={p.firestoreId}
                    onClick={() => setSelectedId(p.firestoreId)}
                    style={{
                      borderBottom: "1px solid var(--bdr)",
                      background: selectedId === p.firestoreId
                        ? "rgba(0,212,170,.06)"
                        : done
                        ? "rgba(148,163,184,.03)"
                        : "transparent",
                      cursor: "pointer",
                      transition: "background .15s",
                      opacity: done ? 0.78 : 1,
                    }}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Av name={p.name} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            {p.condition}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td
                      style={{
                        padding: "14px 20px",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      {p.room || "—"}
                    </td>

                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 70,
                            height: 5,
                            background: "rgba(255,255,255,.08)",
                            borderRadius: 999,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: bc,
                              borderRadius: 999,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {p.waitMinutes || 0}m
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "14px 20px" }}>
                      <Pill status={p.status} />
                    </td>

                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <BtnSm
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(p.firestoreId);
                          }}
                        >
                          View
                        </BtnSm>
                        <BtnSm
                          v="adv"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdvance(p.firestoreId);
                          }}
                        >
                          Advance
                        </BtnSm>
                        <BtnSm
                          v="bump"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBump(p.firestoreId);
                          }}
                        >
                          Bump
                        </BtnSm>
                        <BtnSm
                          v="edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(p);
                          }}
                        >
                          Edit
                        </BtnSm>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: 48,
                      color: "#64748b",
                    }}
                  >
                    No patients in queue. Use{" "}
                    <strong style={{ color: "var(--teal)" }}>New Intake</strong> to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TriagePage({ patients, selectedId, setSelectedId, onAdvance, onBump, onAdd, onEdit }) {
  return (
    <div className="pa">
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <h2 style={{ fontFamily:"Inter, sans-serif", fontSize:32, fontWeight:600, letterSpacing:-1 }}>Triage Monitor</h2>
          <p style={{ color:"#64748b", fontSize:14, marginTop:4 }}>Fast status updates during peak hours</p>
        </div>
        <button
          onClick={onAdd}
          style={{
            background:"var(--teal)", color:"#000", border:"none", padding:"11px 22px",
            borderRadius:10, fontWeight:700, fontSize:14, display:"flex", alignItems:"center", gap:8,
            boxShadow:"0 0 16px var(--tglow)"
          }}
        >
          {I.Plus} New Intake
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
        {patients.map((p) => (
          <div
            key={p.firestoreId}
            onClick={() => setSelectedId(p.firestoreId)}
            style={{
              background:"var(--surf)", cursor:"pointer", transition:"all .25s",
              border:`1px solid ${selectedId === p.firestoreId ? "var(--teal)" : "var(--bdr)"}`,
              boxShadow:selectedId === p.firestoreId ? "0 0 20px rgba(0,212,170,.15)" : "none",
              borderRadius:16, padding:20
            }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontWeight:600, fontSize:15 }}>{p.name}</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{p.room} · Age {p.age}</div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <BtnSm onClick={(e) => { e.stopPropagation(); onEdit(p); }}>Edit</BtnSm>
                <BtnSm onClick={(e) => { e.stopPropagation(); setSelectedId(p.firestoreId); }}>Select</BtnSm>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
              <Pill status={p.status}/>
              <span style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontFamily:"Inter, sans-serif", background:"rgba(255,255,255,.06)", color:"#64748b" }}>
                P{p.priority}
              </span>
              <span style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontFamily:"Inter, sans-serif", background:"rgba(255,255,255,.06)", color:"#64748b" }}>
                {p.waitMinutes || 0}m
              </span>
            </div>
            <p style={{ fontSize:13, color:"#94a3b8", lineHeight:1.55, marginBottom:14, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
              {p.lastUpdate}
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={(e) => { e.stopPropagation(); onAdvance(p.firestoreId); }}
                style={{ flex:1, background:"var(--teal)", color:"#000", border:"none", padding:"10px 0", borderRadius:8, fontWeight:600, fontSize:13 }}
              >
                Advance
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onBump(p.firestoreId); }}
                style={{ flex:1, background:"rgba(255,255,255,.06)", border:"1px solid var(--bdr)", color:"var(--text)", padding:"10px 0", borderRadius:8, fontSize:13 }}
              >
                Bump Priority
              </button>
            </div>
          </div>
        ))}
        {patients.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:60, color:"#64748b" }}>
            No patients in triage.
          </div>
        )}
      </div>
    </div>
  );
}

function PortalPage({ patient }) {
  if (!patient) {
    return (
      <div style={{ textAlign:"center", padding:60, color:"#64748b" }}>
        Select a patient to preview their kiosk view.
      </div>
    );
  }

  return (
    <div className="pa" style={{ maxWidth:620, margin:"0 auto" }}>
      <div style={{ marginBottom:28 }}>
        <h2 style={{ fontFamily:"Inter, sans-serif", fontSize:32, fontWeight:600, letterSpacing:-1 }}>Patient Portal</h2>
        <p style={{ color:"#64748b", fontSize:14, marginTop:4 }}>What the patient sees in the waiting room kiosk</p>
      </div>

      <div style={{ background:"var(--surf)", border:"1px solid var(--bdr)", borderRadius:20, overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#0d1f35 0%,#071420 100%)", borderBottom:"1px solid var(--bdr)", padding:"40px 36px", textAlign:"center" }}>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:80, fontWeight:600, letterSpacing:-4, color:"var(--teal)", lineHeight:1, animation:"gp 3s ease-in-out infinite" }}>
            {patient.waitMinutes || 0}–{(patient.waitMinutes || 0) + 12}
          </div>
          <div style={{ color:"#64748b", fontSize:16, marginTop:8 }}>minutes estimated wait</div>
        </div>

        <div style={{ padding:28 }}>
          <Lbl>Current Status</Lbl>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:26, fontWeight:700, marginBottom:6 }}>
            {patient.portalStatus || patient.status}
          </div>
          <p style={{ fontSize:14, color:"#64748b", lineHeight:1.7, marginBottom:28 }}>{patient.fairnessNote}</p>

          <Lbl>Your Timeline</Lbl>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(patient.timeline || []).map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"12px 16px", background:"var(--panel)", borderRadius:10, fontSize:14 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--teal)", flexShrink:0, marginTop:5 }}/>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomsPage({ patients, selectedId, setSelectedId }) {
  return (
    <div className="pa">
      <div style={{ marginBottom:28 }}>
        <h2 style={{ fontFamily:"Inter, sans-serif", fontSize:32, fontWeight:600, letterSpacing:-1 }}>Room Overview</h2>
        <p style={{ color:"#64748b", fontSize:14, marginTop:4 }}>Current patient assignments across all departments</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
        {patients.map((p) => (
          <button
            key={p.firestoreId}
            onClick={() => setSelectedId(p.firestoreId)}
            style={{
              background:selectedId === p.firestoreId ? "rgba(0,212,170,.05)" : "var(--surf)",
              border:`1px solid ${selectedId === p.firestoreId ? "var(--teal)" : "var(--bdr)"}`,
              borderRadius:16, padding:22, textAlign:"left", width:"100%", cursor:"pointer", transition:"all .2s"
            }}
          >
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:18, fontWeight:500, color:"var(--teal)", marginBottom:8 }}>{p.room || "—"}</div>
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:16, fontWeight:700, marginBottom:14 }}>{p.name}</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <Pill status={p.status}/>
              <span style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"#64748b" }}>{p.waitMinutes || 0}m</span>
            </div>
          </button>
        ))}
        {patients.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:60, color:"#64748b" }}>
            No rooms occupied.
          </div>
        )}
      </div>
    </div>
  );
}

function DetailPanel({ patient, onAdvance, onBump, onEdit }) {
  if (!patient) {
    return (
      <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#64748b", gap:12 }}>
        <div style={{ fontSize:40, opacity:0.25 }}>🏥</div>
        <span style={{ fontSize:14 }}>Select a patient to view details</span>
      </div>
    );
  }

  return (
    <div style={{ animation:"fi .2s ease", maxWidth:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, paddingBottom:20, borderBottom:"1px solid var(--bdr)" }}>
        <Av name={patient.name} size="lg"/>
        <div>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:19, fontWeight:700 }}>{patient.name}</div>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:11, color:"#64748b", marginTop:3 }}>
            Age {patient.age} · {patient.condition}
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        {[{ l:"Room", v:patient.room || "—" }, { l:"Priority", v:`Lvl ${patient.priority || 1}` }].map((s) => (
          <div key={s.l} style={{ background:"var(--panel)", borderRadius:10, padding:14 }}>
            <Lbl>{s.l}</Lbl>
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:19, fontWeight:700, color:"var(--teal)" }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"var(--panel)", borderRadius:10, padding:14, marginBottom:10 }}>
        <Lbl>Nurse / Clinician</Lbl>
        <div style={{ fontSize:14, fontWeight:600 }}>{patient.nurse || "Unassigned"}</div>
      </div>

      <div style={{ background:"var(--panel)", borderRadius:10, padding:14, fontSize:13, color:"#94a3b8", lineHeight:1.6, marginBottom:16 }}>
        <Lbl>Last Update</Lbl>
        {patient.lastUpdate || "—"}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <button
          onClick={() => onAdvance(patient.firestoreId)}
          style={{
            flex:1, background:"var(--teal)", color:"#000", border:"none",
            padding:12, borderRadius:10, fontWeight:700, fontSize:13,
            boxShadow:"0 0 14px var(--tglow)"
          }}
        >
          Advance Stage
        </button>
        <button
          onClick={() => onBump(patient.firestoreId)}
          style={{
            flex:1, background:"none", border:"1px solid rgba(245,158,11,.35)",
            color:"var(--amber)", padding:12, borderRadius:10, fontWeight:600, fontSize:13
          }}
        >
          Bump Priority
        </button>
      </div>

      <button
        onClick={() => onEdit(patient)}
        style={{
          width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid var(--bdr)",
          color:"var(--text)", padding:"10px", borderRadius:10, fontWeight:600, fontSize:13,
          display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:20
        }}
      >
        {I.Edit} Edit Patient Details
      </button>

      <div style={{ background:"var(--panel)", borderRadius:12, padding:16 }}>
        <Lbl>Patient Portal View</Lbl>
        <div style={{ fontFamily:"Inter, sans-serif", fontSize:30, fontWeight:600, color:"var(--teal)" }}>
          {patient.waitMinutes || 0}–{(patient.waitMinutes || 0) + 10} min
        </div>
        <div style={{ marginTop:8 }}><Pill status={patient.portalStatus || patient.status}/></div>
        <p style={{ fontSize:12, color:"#64748b", marginTop:10, lineHeight:1.6 }}>{patient.fairnessNote}</p>
      </div>

      {patient.notes && (
        <div style={{ background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.2)", borderRadius:10, padding:14, marginTop:12 }}>
          <Lbl>Intake Notes</Lbl>
          <p style={{ fontSize:13, color:"#d4a017", lineHeight:1.6 }}>{patient.notes}</p>
        </div>
      )}
    </div>
  );
}

const BST = {
  default:{ background:"rgba(255,255,255,.07)", color:"var(--text)", border:"none" },
  adv:{ background:"var(--teal)", color:"#000", border:"none", boxShadow:"0 0 8px var(--tglow)" },
  bump:{ background:"rgba(245,158,11,.12)", color:"#f59e0b", border:"1px solid rgba(245,158,11,.25)" },
  edit:{ background:"rgba(99,102,241,.12)", color:"#a5b4fc", border:"1px solid rgba(99,102,241,.25)" },
};

function BtnSm({ v="default", children, style={}, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:"6px 12px", borderRadius:7, fontSize:11, fontWeight:600,
        transition:"opacity .2s", ...BST[v], ...style
      }}
    >
      {children}
    </button>
  );
}

function MainApp({ user }) {
  const [patients, setPatients] = useState([]);
  const [activePage, setPage] = useState("dashboard");
  const [selectedId, setSelId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSort] = useState("Recent Activity");
  const [dbLoad, setDbLoad] = useState(true);
  const [dbErr, setDbErr] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1600);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [theme, setTheme] = useState(localStorage.getItem("pq-theme") || "dark");
  const [compactMode, setCompactMode] = useState(localStorage.getItem("pq-compact") === "1");
  const [soundAlerts, setSoundAlerts] = useState(localStorage.getItem("pq-sound") !== "0");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lastAlertIds, setLastAlertIds] = useState([]);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("pq-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("pq-compact", compactMode ? "1" : "0");
  }, [compactMode]);

  useEffect(() => {
    localStorage.setItem("pq-sound", soundAlerts ? "1" : "0");
  }, [soundAlerts]);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const showInlinePanel = vw >= 1500;
  const shellCols = showInlinePanel
    ? "230px minmax(0,1fr) 300px"
    : "220px minmax(0,1fr)";

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "patients"),
      (snap) => {
        const data = snap.docs
          .map((d) => ({ firestoreId:d.id, ...d.data() }))
          .sort((a, b) => {
            const aSec = a.createdAt?.seconds || 0;
            const bSec = b.createdAt?.seconds || 0;
            return bSec - aSec;
          });

        setPatients(data);
        setDbLoad(false);
        if (!selectedId && data.length > 0) setSelId(data[0].firestoreId);
      },
      (err) => {
        console.error(err);
        setDbErr("Firestore error: " + err.message);
        setDbLoad(false);
      }
    );

    return () => unsub();
  }, [selectedId]);

  useEffect(() => {
    const emergencyPatients = patients.filter(
      (p) => p.status === "Emergency" || p.status === "Critical"
    );

    const newNotifications = emergencyPatients.map((p) => ({
      id: `${p.firestoreId}-${p.status}`,
      title: p.status === "Emergency" ? "Emergency Alert" : "Critical Alert",
      message: `${p.name} requires immediate attention in ${p.room || "unassigned room"}.`,
      time: new Date().toLocaleTimeString([], { hour:"numeric", minute:"2-digit" }),
      color: "#f87171",
    }));

    setNotifications(newNotifications);
  }, [patients]);

  useEffect(() => {
    if (!soundAlerts) return;
    if (notifications.length === 0) return;

    const currentIds = notifications.map((n) => n.id);
    const hasNewAlert = currentIds.some((id) => !lastAlertIds.includes(id));

    if (!hasNewAlert) return;

    const emergencyExists = notifications.some((n) => n.title.includes("Emergency"));
    if (!emergencyExists) {
      setLastAlertIds(currentIds);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        setLastAlertIds(currentIds);
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.03;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      setLastAlertIds(currentIds);
    } catch {
      setLastAlertIds(currentIds);
    }
  }, [notifications, soundAlerts, lastAlertIds]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.name} ${p.firestoreId} ${p.condition} ${p.status} ${p.room}`.toLowerCase().includes(q)
    );
  }, [patients, search]);

  const selected = patients.find((p) => p.firestoreId === selectedId) || null;

  useEffect(() => {
    if (!showInlinePanel && selected) {
      setDetailsOpen(true);
    }
  }, [selected, showInlinePanel]);

  async function bumpPriority(fid) {
    const p = patients.find((x) => x.firestoreId === fid);
    if (!p) return;
    const np = Math.min(5, (p.priority || 1) + 1);

    try {
      await updateDoc(doc(db, "patients", fid), {
        priority: np,
        status: np >= 5 ? "Emergency" : p.status,
        lastUpdate: "Priority manually adjusted by staff.",
        fairnessNote: "Your estimated wait changed because your clinical priority was updated.",
      });
      setSelId(fid);
    } catch (e) {
      setDbErr("Could not update priority: " + e.message);
    }
  }

  async function advancePatient(fid) {
    const p = patients.find((x) => x.firestoreId === fid);
    if (!p) return;

    const ns =
      p.status === "Waiting" ? "Treatment" :
      p.status === "Treatment" ? "Complete" :
      p.status === "Emergency" ? "Treatment" :
      p.status;

    const np =
      ns === "Treatment" ? "Next" :
      ns === "Complete" ? "Completed" :
      p.portalStatus;

    try {
      await updateDoc(doc(db, "patients", fid), {
        status: ns,
        portalStatus: np,
        waitMinutes: Math.max(0, (p.waitMinutes || 0) - 6),
        lastUpdate: ns === "Complete"
          ? "Visit completed and summary prepared."
          : "Patient moved to the next care stage.",
        timeline: [...(p.timeline || []), ns === "Complete" ? "Visit completed" : "Moved to next care stage"],
      });
      setSelId(fid);
    } catch (e) {
      setDbErr("Could not advance: " + e.message);
    }
  }

  function openAdd() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditTarget(p);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
  }

  if (dbLoad) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:16, position:"relative", zIndex:1
      }}>
        <Spin size={32}/>
        <span style={{ fontFamily:"Inter, sans-serif", fontSize:11, color:"#64748b", letterSpacing:"2px" }}>
          LOADING QUEUE DATA…
        </span>
      </div>
    );
  }

  return (
    <>
      <PatientModal open={modalOpen} onClose={closeModal} initial={editTarget} />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        setTheme={setTheme}
        compactMode={compactMode}
        setCompactMode={setCompactMode}
        soundAlerts={soundAlerts}
        setSoundAlerts={setSoundAlerts}
      />

      <div
        style={{
          position:"relative", zIndex:1, display:"grid",
          gridTemplateColumns:shellCols,
          gridTemplateRows:"64px 1fr",
          minHeight:"100vh", width:"100%", overflow:"hidden"
        }}
      >
        <aside
          style={{
            gridRow:"1/3", background:"var(--surf)", borderRight:"1px solid var(--bdr)",
            display:"flex", flexDirection:"column", padding:"20px 14px", gap:4, minWidth:0
          }}
        >
          <div
            style={{
              display:"flex", alignItems:"center", gap:12, padding:"12px 8px 24px",
              borderBottom:"1px solid var(--bdr)", marginBottom:12
            }}
          >
            <div
              style={{
                width:46, height:46, borderRadius:12, border:"3px solid var(--teal)",
                flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                <polyline points="5,12 9,12 11,8 14,16 16,12 19,12"></polyline>
              </svg>
            </div>

            <div>
              <div
                style={{
                  fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:20,
                  letterSpacing:"-0.8px", color:"var(--teal)", lineHeight:1
                }}
              >
                PulseQueue
              </div>
              <div
                style={{
                  fontFamily:"Inter, sans-serif", fontSize:10, color:"var(--teal)",
                  letterSpacing:"2px", marginTop:4
                }}
              >
                LIVE QUEUE SYSTEM
              </div>
            </div>
          </div>

          {NAV.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              style={{
                width:"100%",
                background:activePage === key ? "var(--tdim)" : "none",
                border:activePage === key ? "1px solid rgba(0,212,170,.2)" : "1px solid transparent",
                color:activePage === key ? "var(--teal)" : "#64748b",
                display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10,
                fontSize:14, fontWeight:500, cursor:"pointer", transition:"all .2s", textAlign:"left"
              }}
            >
              {icon}{label}
            </button>
          ))}

          <div style={{ marginTop:"auto", background:"var(--panel)", border:"1px solid var(--bdr)", borderRadius:10, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <Av name={user.email?.split("@")[0] || "Staff"} size="sm"/>
              <div>
                <div style={{ fontSize:12, fontWeight:600, maxWidth:150, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user.email}
                </div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:1 }}>Authenticated Staff</div>
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              style={{
                width:"100%", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)",
                color:"#f87171", padding:"9px 14px", borderRadius:8, fontSize:12, fontWeight:600,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8
              }}
            >
              {I.Logout} Sign Out
            </button>
          </div>

          <div style={{
            marginTop:8, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)",
            borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:8,
            fontSize:12, color:"#f87171", fontWeight:500
          }}>
            {I.Warn} Emergency Protocol Active
          </div>
        </aside>

        <header style={{
          background:"var(--surf)", borderBottom:"1px solid var(--bdr)",
          display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px"
        }}>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:19, fontWeight:700 }}>
            {NAV.find((n) => n.key === activePage)?.label}
          </div>

          <div style={{ position:"relative", flex:1, maxWidth:340, margin:"0 28px" }}>
            <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#64748b" }}>{I.Search}</div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients, rooms, IDs…"
              style={{
                width:"100%", background:"var(--panel)", border:"1px solid var(--bdr)",
                borderRadius:10, padding:"9px 14px 9px 40px", color:"var(--text)", fontSize:14, transition:"border-color .2s"
              }}
              onFocus={fo}
              onBlur={bl}
            />
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:6, position:"relative" }}>
            <div style={{ position:"relative" }}>
              <button
                onClick={() => {
                  setShowNotifications((v) => !v);
                  setShowSettings(false);
                }}
                style={{
                  background:"none", border:"none", color:"#64748b", padding:8, borderRadius:8,
                  display:"flex", position:"relative"
                }}
              >
                {I.Bell}
                {notifications.length > 0 && (
                  <span
                    style={{
                      position:"absolute", top:2, right:2, minWidth:16, height:16, borderRadius:999,
                      background:"#ef4444", color:"#fff", fontSize:10, fontWeight:700,
                      display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px"
                    }}
                  >
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <NotificationsDropdown
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>

            <button
              onClick={() => {
                setShowSettings(true);
                setShowNotifications(false);
              }}
              style={{
                background:"none", border:"none", color:"#64748b", padding:8, borderRadius:8, display:"flex"
              }}
            >
              {I.Cog}
            </button>

            <div style={{ display:"flex", alignItems:"center", gap:10, marginLeft:10, paddingLeft:14, borderLeft:"1px solid var(--bdr)" }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{user.email?.split("@")[0]}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>Staff</div>
              </div>
              <Av name={user.email?.split("@")[0] || "S"} size="sm"/>
            </div>
          </div>
        </header>

        <main
          style={{
            padding:20, overflowY:"auto", overflowX:"hidden", background:"var(--bg)", minWidth:0
          }}
        >
          {dbErr && (
            <div style={{
              background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
              borderRadius:10, padding:"10px 16px", fontSize:13, color:"#f87171",
              marginBottom:20, display:"flex", alignItems:"center", gap:8
            }}>
              {I.Warn}{dbErr}
            </div>
          )}

          {activePage === "dashboard" && (
            <DashboardPage
              patients={filtered}
              selectedId={selectedId}
              setSelectedId={setSelId}
              sortMode={sortMode}
              setSortMode={setSort}
              onAdvance={advancePatient}
              onBump={bumpPriority}
              onAdd={openAdd}
              onEdit={openEdit}
              compactMode={compactMode}
            />
          )}

          {activePage === "triage" && (
            <TriagePage
              patients={filtered}
              selectedId={selectedId}
              setSelectedId={setSelId}
              onAdvance={advancePatient}
              onBump={bumpPriority}
              onAdd={openAdd}
              onEdit={openEdit}
            />
          )}

          {activePage === "portal" && <PortalPage patient={selected} />}
          {activePage === "rooms" && <RoomsPage patients={filtered} selectedId={selectedId} setSelectedId={setSelId} />}
        </main>

        {showInlinePanel ? (
          <aside
            style={{
              gridRow:"2/3", background:"var(--surf)", borderLeft:"1px solid var(--bdr)",
              padding:18, overflowY:"auto", minWidth:0, width:"100%"
            }}
          >
            <DetailPanel
              patient={selected}
              onAdvance={advancePatient}
              onBump={bumpPriority}
              onEdit={openEdit}
            />
          </aside>
        ) : (
          <>
            <button
              onClick={() => setDetailsOpen(true)}
              style={{
                position:"fixed", right:18, bottom:18, zIndex:50,
                background:"var(--teal)", color:"#000", border:"none", borderRadius:12,
                padding:"12px 16px", fontWeight:700, boxShadow:"0 0 20px var(--tglow)"
              }}
            >
              Open Details
            </button>

            {detailsOpen && (
              <div
                onClick={() => setDetailsOpen(false)}
                style={{
                  position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:60
                }}
              >
                <aside
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position:"absolute", top:0, right:0, width:"min(92vw, 360px)", height:"100%",
                    background:"var(--surf)", borderLeft:"1px solid var(--bdr)", padding:18, overflowY:"auto"
                  }}
                >
                  <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
                    <button
                      onClick={() => setDetailsOpen(false)}
                      style={{
                        background:"rgba(255,255,255,.06)", border:"1px solid var(--bdr)",
                        color:"var(--text)", borderRadius:8, padding:"8px 10px"
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <DetailPanel
                    patient={selected}
                    onAdvance={advancePatient}
                    onBump={bumpPriority}
                    onEdit={openEdit}
                  />
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function PatientPublicView({ onBack }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "patients"), (snap) => {
      const data = snap.docs.map((d) => ({
        firestoreId: d.id,
        ...d.data(),
      }));

      setPatients(data);
      setLastUpdated(new Date());
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const activePatients = useMemo(() => {
    return patients.filter(
      (p) => !["Complete", "Completed"].includes(p.status)
    );
  }, [patients]);

  const queueOrderedPatients = useMemo(() => {
  return [...activePatients]
    .filter((p) => !["Treatment"].includes(p.status))
    .sort((a, b) => {
      const aEmergency = a.status === "Emergency" ? 1 : 0;
      const bEmergency = b.status === "Emergency" ? 1 : 0;

      return (
        bEmergency - aEmergency ||
        (b.priority || 0) - (a.priority || 0) ||
        (a.waitMinutes || 0) - (b.waitMinutes || 0)
      );
    });
}, [activePatients]);

const treatmentPatients = useMemo(() => {
  return activePatients.filter((p) => p.status === "Treatment");
}, [activePatients]);

  const completedPatients = useMemo(() => {
    return patients.filter((p) =>
      ["Complete", "Completed"].includes(p.status)
    );
  }, [patients]);

  const sortedPatients = useMemo(() => {
  return [...queueOrderedPatients, ...treatmentPatients, ...completedPatients];
}, [queueOrderedPatients, treatmentPatients, completedPatients]);

  const queuePositionMap = useMemo(() => {
    const map = {};
    queueOrderedPatients.forEach((p, index) => {
      map[p.firestoreId] = index + 1;
    });
    return map;
  }, [queueOrderedPatients]);

  // Waiting should NOT include Treatment
  const totalWaiting = activePatients.filter((p) =>
    ["Waiting", "Emergency", "Critical", "Urgent", "Next", "Be prepared"].includes(
      p.status
    )
  ).length;

  // Active still includes Treatment because activePatients excludes only completed
  const activeCount = activePatients.length;

  const avgWait = activePatients.length
    ? Math.round(
        activePatients.reduce((a, p) => a + (p.waitMinutes || 0), 0) /
          activePatients.length
      )
    : 0;

  const emergencyCount = activePatients.filter((p) =>
    ["Emergency", "Critical", "Urgent"].includes(p.status)
  ).length;

  let loadLabel = "Low";
  let loadColor = "var(--teal)";
  let loadBg = "rgba(0,212,170,.12)";
  let loadBorder = "rgba(0,212,170,.2)";

  if (emergencyCount >= 2 || totalWaiting >= 8) {
    loadLabel = "High";
    loadColor = "#f87171";
    loadBg = "rgba(239,68,68,.12)";
    loadBorder = "rgba(239,68,68,.25)";
  } else if (totalWaiting >= 4 || avgWait >= 15) {
    loadLabel = "Moderate";
    loadColor = "#fbbf24";
    loadBg = "rgba(245,158,11,.12)";
    loadBorder = "rgba(245,158,11,.25)";
  }

  const formattedLastUpdated = lastUpdated
    ? lastUpdated.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 28,
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 28,
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 34, fontWeight: 700, color: "var(--teal)" }}>
              Patient View
            </div>
            <div style={{ color: "#94a3b8", marginTop: 6 }}>
              Public queue transparency view
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Last updated: {formattedLastUpdated}
            </div>
          </div>

          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,.06)",
              border: "1px solid var(--bdr)",
              color: "var(--text)",
              padding: "10px 16px",
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            Back
          </button>
        </div>

        {loading ? (
          <div style={{ color: "#94a3b8" }}>Loading patient queue…</div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 16,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  background: "var(--surf)",
                  border: "1px solid var(--bdr)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 34, fontWeight: 700 }}>{totalWaiting}</div>
                <div style={{ color: "#64748b", marginTop: 6 }}>
                  Patients Waiting
                </div>
              </div>

              <div
                style={{
                  background: "var(--surf)",
                  border: "1px solid var(--bdr)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 34, fontWeight: 700 }}>{avgWait} min</div>
                <div style={{ color: "#64748b", marginTop: 6 }}>
                  Average Wait Time
                </div>
              </div>

              <div
                style={{
                  background: "var(--surf)",
                  border: "1px solid var(--bdr)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 34, fontWeight: 700 }}>{activeCount}</div>
                <div style={{ color: "#64748b", marginTop: 6 }}>
                  Active Patients
                </div>
              </div>

              <div
                style={{
                  background: "var(--surf)",
                  border: `1px solid ${loadBorder}`,
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 34, fontWeight: 700, color: loadColor }}>
                  {loadLabel}
                </div>
                <div style={{ color: "#64748b", marginTop: 6 }}>
                  Current Load
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: loadBg,
                    border: `1px solid ${loadBorder}`,
                    color: loadColor,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: loadColor,
                    }}
                  />
                  Queue pressure
                </div>
              </div>
            </div>

            <div
              style={{
                background: "var(--surf)",
                border: "1px solid var(--bdr)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid var(--bdr)",
                  fontWeight: 700,
                }}
              >
                Live Queue Information
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--bdr)" }}>
                      {["Patient", "Position", "Status", "Estimated Wait"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "14px 20px",
                            textAlign: "left",
                            fontSize: 11,
                            color: "#64748b",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {sortedPatients.map((p) => {
                      const isCompleted = ["Complete", "Completed"].includes(p.status);

                      return (
                        <tr
                          key={p.firestoreId}
                          style={{
                            borderBottom: "1px solid var(--bdr)",
                            opacity: isCompleted ? 0.7 : 1,
                          }}
                        >
                          <td style={{ padding: "16px 20px", fontWeight: 600 }}>
                            {p.name}
                          </td>

                          <td
                            style={{
                              padding: "16px 20px",
                              fontWeight: 600,
                              color: "#94a3b8",
                            }}
                          >
                            {isCompleted || p.status === "Treatment"
  ? "—"
  : `#${queuePositionMap[p.firestoreId]}`}
                          </td>

                          <td style={{ padding: "16px 20px" }}>
                            <Pill status={p.portalStatus || p.status} />
                          </td>

                          <td style={{ padding: "16px 20px" }}>
                            {isCompleted
                              ? "Completed"
                              : `${p.waitMinutes || 0}–${(p.waitMinutes || 0) + 10} min`}
                          </td>
                        </tr>
                      );
                    })}

                    {sortedPatients.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            padding: 30,
                            textAlign: "center",
                            color: "#64748b",
                          }}
                        >
                          No queue data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoad, setAuthLoad] = useState(true);
  const [entryMode, setEntryMode] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoad(false);
    });
    return () => unsub();
  }, []);

  return (
    <>
      <style>{G}</style>

      {authLoad ? (
        <div
          style={{
            minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:16, position:"relative", zIndex:1
          }}
        >
          <Spin size={24} />
          <span style={{ fontFamily:"Inter, sans-serif", fontSize:11, color:"#64748b", letterSpacing:"2px" }}>
            INITIALISING…
          </span>
        </div>
      ) : user ? (
        <MainApp user={user} />
      ) : entryMode === "staff" ? (
        <LoginPage onBack={() => setEntryMode(null)} />
      ) : entryMode === "patient" ? (
        <PatientPublicView onBack={() => setEntryMode(null)} />
      ) : (
        <EntryChoice onChoose={setEntryMode} />
      )}
    </>
  );
}