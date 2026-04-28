"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setWorkspaceId } from "@/lib/workspace";
import { useRouter } from "next/navigation";
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

type Workspace = { id: string; name: string; role: string };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Workspace picker state — shown after sign-in when user has multiple workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.session) {
      setError(signInError?.message ?? "Sign in failed");
      setLoading(false);
      return;
    }

    // Fetch workspace memberships
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("role, workspaces(id, name)")
      .eq("user_id", data.session.user.id);

    const list: Workspace[] = (memberships ?? [])
      .filter((m) => m.workspaces)
      .map((m) => ({
        id: (m.workspaces as any).id,
        name: (m.workspaces as any).name,
        role: m.role,
      }));

    if (list.length === 0) {
      setError("No workspace found. Ask your admin to invite you.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (list.length === 1) {
      setWorkspaceId(list[0].id);
      // Hard navigation so the browser sends the full cookie jar (Supabase
      // session + workspace cookie) in the middleware's incoming request.
      // router.push() is an RSC soft-nav that can arrive before cookies are
      // visible server-side, causing the middleware to see no session.
      window.location.href = "/dashboard";
      return;
    }

    // Multiple workspaces — show picker
    setWorkspaces(list);
    setLoading(false);
  }

  function pickWorkspace(id: string) {
    setWorkspaceId(id);
    window.location.href = "/dashboard";
  }

  // ── Workspace picker ─────────────────────────────────────────────────────────
  if (workspaces.length > 0) {
    return (
      <main style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F }}>
        <div style={{ width: "100%", maxWidth: 400, padding: 20 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 24, fontWeight: 800, background: `linear-gradient(135deg,${C.ac},#00c896,#4dabf7)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Shorts Studio
            </div>
            <div style={{ fontSize: 11, color: C.t2, marginTop: 4 }}>Select a workspace</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => pickWorkspace(ws.id)}
                style={{
                  padding: "14px 18px", borderRadius: 10, border: `1.5px solid ${C.b1}`,
                  background: C.s2, color: C.t1, cursor: "pointer", fontFamily: F,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: 14, fontWeight: 700, textAlign: "left",
                }}
              >
                <span>{ws.name}</span>
                <span style={{ fontSize: 10, color: ws.role === "admin" ? C.ac : C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {ws.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Sign-in form ─────────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F }}>
      <link href="https://fonts.googleapis.com/css2?family=Satoshi:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 400, padding: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, background: `linear-gradient(135deg,${C.ac},#00c896,#4dabf7)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Shorts Studio
          </div>
          <div style={{ fontSize: 11, color: C.t2, marginTop: 4 }}>Sign in to your workspace</div>
        </div>

        <form onSubmit={handleSubmit} style={{ background: C.s2, border: `1.5px solid ${C.b1}`, borderRadius: 11, padding: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
          </div>

          {error && (
            <div style={{ fontSize: 11, color: C.rd, marginBottom: 12, padding: "7px 10px", background: C.rdd, borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: F, background: C.ac, color: C.bg, border: "none", opacity: loading ? 0.5 : 1, boxShadow: `0 2px 14px ${C.acg}` }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: C.t3 }}>
            No workspace?{" "}
            <Link href="/signup" style={{ color: C.ac, textDecoration: "none", fontWeight: 700 }}>
              Create one
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
