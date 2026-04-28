"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setWorkspaceId } from "@/lib/workspace";
import Link from "next/link";

const C = {
  bg: "#050508", s2: "#13131e", b1: "#23233a",
  ac: "#00e5a0", acg: "rgba(0,229,160,0.2)", rd: "#ff4d6a", rdd: "rgba(255,77,106,0.08)",
  t1: "#e8e8f4", t2: "#9090a8", t3: "#55556e",
};
const F = "'Satoshi', 'DM Sans', sans-serif";
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 13px", borderRadius: 8, border: `1px solid ${C.b1}`,
  background: C.bg, color: C.t1, fontSize: 13, outline: "none", fontFamily: F, boxSizing: "border-box",
};

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Backend creates user + workspace + admin member via service role
    const signupRes = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, workspaceName, fullName }),
    });
    const signupData = await signupRes.json();

    if (!signupRes.ok) {
      setError(signupData.error ?? "Signup failed");
      setLoading(false);
      return;
    }

    // 2. Sign in to get a session (auth user already confirmed server-side)
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // 3. Store active workspace in cookie then hard-navigate so middleware
    // sees both the Supabase session cookie and the workspace cookie.
    setWorkspaceId(signupData.workspace_id);
    window.location.href = "/dashboard";
  }

  return (
    <main style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F }}>
      <link href="https://fonts.googleapis.com/css2?family=Satoshi:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 420, padding: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, background: `linear-gradient(135deg,${C.ac},#00c896,#4dabf7)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Shorts Studio
          </div>
          <div style={{ fontSize: 11, color: C.t2, marginTop: 4 }}>Create your workspace</div>
        </div>

        <form onSubmit={handleSubmit} style={{ background: C.s2, border: `1.5px solid ${C.b1}`, borderRadius: 11, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>Your name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jane Smith" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>Workspace name</label>
              <input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} required placeholder="My Brand Studio" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters" style={inputStyle} />
          </div>

          {error && (
            <div style={{ fontSize: 11, color: C.rd, marginBottom: 12, padding: "7px 10px", background: C.rdd, borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: F, background: C.ac, color: C.bg, border: "none", opacity: loading ? 0.5 : 1, boxShadow: `0 2px 14px ${C.acg}` }}>
            {loading ? "Creating workspace…" : "Create workspace"}
          </button>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: C.t3 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: C.ac, textDecoration: "none", fontWeight: 700 }}>
              Sign in
            </Link>
          </div>
        </form>
      </div>

      <footer style={{ textAlign: "center", paddingBottom: 24, fontSize: 11, color: C.t3 }}>
        <Link href="/tos" style={{ color: C.t3, textDecoration: "none", marginRight: 16 }}>Terms of Service</Link>
        <Link href="/privacy" style={{ color: C.t3, textDecoration: "none" }}>Privacy Policy</Link>
      </footer>
    </main>
  );
}
