/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGate } from "./components/AuthGate";
import { useUser } from "./context/UserProvider";
import { addItem } from "./lib/items";
export default function HomePage() {
  return (
    <AuthGate requireCouple>
      <HomeInner />
    </AuthGate>
  );
}

function HomeInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { fbUser, userDoc } = useUser();

  const coupleId = userDoc!.coupleId!;
  const uid = fbUser!.uid;

  const sharedUrl = sp.get("sharedUrl") || "";
  const sharedTitle = sp.get("sharedTitle") || "";
  const sharedText = sp.get("sharedText") || "";

  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const hasShared = useMemo(() => !!sharedUrl, [sharedUrl]);

  useEffect(() => {
    if (!hasShared) return;
    setUrl(sharedUrl);
    setNote(sharedText);
  }, [hasShared, sharedUrl, sharedText]);

  async function save() {
    setMsg(null);
    const finalUrl = (url || "").trim();
    if (!finalUrl) return setMsg("Pega un link primero.");

    setSaving(true);
    try {
      await addItem({
        coupleId,
        createdBy: uid,
        url: finalUrl,
        title: sharedTitle || null,
        note: note || null,
        collectionId: "INBOX",
      });

      setMsg("Guardado ✅");

      // Limpia query params para no re-guardar al refresh
      router.replace("/");
      setUrl("");
      setNote("");
    } catch (e: any) {
      setMsg(e?.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Inbox</h1>
      <p style={{ opacity: 0.8 }}>
        Comparte links desde Android a esta PWA o pégalos aquí.
      </p>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega un link…"
          style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota opcional…"
          rows={3}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
        />
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: 12, borderRadius: 12, border: "none", background: "black", color: "white" }}
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {msg && <div style={{ padding: 10, borderRadius: 12, background: "#f3f3f3" }}>{msg}</div>}
      </div>

      {hasShared && (
        <p style={{ marginTop: 10, opacity: 0.7 }}>
          (Te llegó desde “Compartir” ✅)
        </p>
      )}
    </main>
  );
}
