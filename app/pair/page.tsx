/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useUser } from "../context/UserProvider";
import { createInvite, joinWithCode } from "../lib/invites";

export default function PairPage() {
  const router = useRouter();
  const { fbUser, userDoc, loading } = useUser();

  // UI state
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const hasCouple = !!userDoc?.coupleId;

  useEffect(() => {
    if (!loading && fbUser && hasCouple) {
      router.replace("/"); // ya tiene pareja
    }
  }, [loading, fbUser, hasCouple, router]);

  useEffect(() => {
    if (userDoc?.pendingInviteCode) setInviteCode(userDoc.pendingInviteCode);
  }, [userDoc?.pendingInviteCode]);

  const cleanInput = useMemo(
    () => inputCode.replace(/\D/g, "").slice(0, 6),
    [inputCode]
  );

  async function loginGoogle() {
    setMsg(null);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function handleCreateCode() {
    if (!fbUser) return;
    setMsg(null);
    setCreating(true);
    try {
      const res = await createInvite(
        fbUser.uid,
        fbUser.displayName || undefined
      );
      setInviteCode(res.code);
    } catch (e: any) {
      setMsg(e?.message || "Error creando el código.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setMsg("Código copiado ✅");
    } catch {
      setMsg("No pude copiar. Selecciónalo manualmente.");
    }
  }

  async function handleJoin() {
    if (!fbUser) return;
    setMsg(null);
    setJoining(true);
    try {
      const { coupleId } = await joinWithCode(fbUser.uid, cleanInput);
      setMsg(`¡Listo! Pareja creada ✅ (${coupleId})`);
      router.replace("/");
    } catch (e: any) {
      setMsg(e?.message || "No se pudo unir con ese código.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>Cargando…</div>
      </main>
    );
  }

  if (!fbUser) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.h1}>Pair Collection</h1>
          <p style={styles.p}>
            Inicia sesión para crear o unirte a una pareja.
          </p>

          <button style={styles.btn} onClick={loginGoogle}>
            Continuar con Google
          </button>

          <p style={{ ...styles.p, marginTop: 12, opacity: 0.8 }}>
            (Luego añadimos email/password si quieres)
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Vincular pareja</h1>
        <p style={styles.p}>
          Crea un código de <b>6 dígitos</b> o únete con uno.
        </p>

        {/* CREAR */}
        <section style={styles.section}>
          <h2 style={styles.h2}>Crear código</h2>
          <button
            style={styles.btn}
            onClick={handleCreateCode}
            disabled={creating}
          >
            {creating ? "Generando…" : "Generar código"}
          </button>

          {inviteCode && (
            <div style={styles.codeBox}>
              <div style={styles.code}>{inviteCode}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={styles.btnSecondary} onClick={handleCopy}>
                  Copiar
                </button>
                <button
                  style={styles.btnSecondary}
                  onClick={() => {
                    setInviteCode(null);
                    setMsg(null);
                  }}
                >
                  Nuevo
                </button>
              </div>
              <p style={{ ...styles.p, marginTop: 10, opacity: 0.8 }}>
                En MVP puedes decirle el código a tu pareja (WhatsAppxx, chat,
                etc.).
              </p>
            </div>
          )}
        </section>

        <hr style={styles.hr} />

        {/* UNIRSE */}
        <section style={styles.section}>
          <h2 style={styles.h2}>Tengo un código</h2>

          <input
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            inputMode="numeric"
            placeholder="Ej: 123456"
            style={styles.input}
            maxLength={6}
          />

          <button
            style={styles.btn}
            onClick={handleJoin}
            disabled={joining || cleanInput.length !== 6}
          >
            {joining ? "Uniendo…" : "Unirme"}
          </button>
        </section>

        {msg && <div style={styles.toast}>{msg}</div>}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "#0b0b0f",
    color: "white",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: "#141420",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 12px 40px rgba(0,0,0,.35)",
  },
  h1: { fontSize: 22, margin: 0, marginBottom: 6 },
  h2: { fontSize: 16, margin: 0, marginBottom: 10, opacity: 0.95 },
  p: { margin: 0, lineHeight: 1.4, opacity: 0.9 },
  section: { marginTop: 14 },
  btn: {
    width: "100%",
    marginTop: 10,
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "white",
    color: "#0b0b0f",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnSecondary: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.15)",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    marginTop: 10,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#0f0f18",
    color: "white",
    fontSize: 16,
    letterSpacing: 2,
  },
  codeBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#0f0f18",
  },
  code: {
    fontSize: 34,
    letterSpacing: 6,
    fontWeight: 800,
    textAlign: "center",
  },
  hr: {
    marginTop: 18,
    border: "none",
    borderTop: "1px solid rgba(255,255,255,.10)",
  },
  toast: {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.10)",
    fontSize: 14,
  },
};
