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

function isProbablyUrl(s: string) {
  const t = (s || "").trim();
  if (!t) return false;
  // soporta urls sin esquema tipo "www..."
  return /^https?:\/\/\S+/i.test(t) || /^www\.\S+/i.test(t);
}

function normalizeUrl(raw: string) {
  let t = (raw || "").trim();
  if (!t) return "";
  // si viene como "www.xxx.com/..." agrega https
  if (/^www\./i.test(t)) t = `https://${t}`;
  // quita espacios internos raros
  t = t.replace(/\s+/g, "");
  // valida
  try {
    const u = new URL(t);
    return u.toString();
  } catch {
    return t; // lo dejamos para que el usuario lo corrija, pero no explotamos
  }
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

  const [clipHint, setClipHint] = useState<string | null>(null);
  const [clipChecked, setClipChecked] = useState(false);

  const hasShared = useMemo(() => !!sharedUrl, [sharedUrl]);

  useEffect(() => {
    if (!hasShared) return;
    setUrl(normalizeUrl(sharedUrl));
    setNote(sharedText);
    // si llegó desde share params, no mostramos hint de clipboard
    setClipHint(null);
    setClipChecked(true);
  }, [hasShared, sharedUrl, sharedText]);

  // intenta “sugerir” (no autopaste) una vez, si no viene de share
  useEffect(() => {
    if (hasShared) return;
    if (clipChecked) return;
    setClipChecked(true);

    (async () => {
      try {
        if (!navigator?.clipboard?.readText) return;
        const text = await navigator.clipboard.readText();
        if (isProbablyUrl(text)) {
          setClipHint(normalizeUrl(text));
        }
      } catch {
        // iOS puede bloquear si no hay gesto; lo ignoramos
      }
    })();
  }, [hasShared, clipChecked]);

  async function pasteFromClipboard() {
    setMsg(null);
    try {
      if (!navigator?.clipboard?.readText) {
        return setMsg("Tu navegador no permite pegar automáticamente. Mantén presionado y pega.");
      }
      const text = await navigator.clipboard.readText();
      if (!text) return setMsg("No encontré nada en el portapapeles.");
      if (!isProbablyUrl(text)) return setMsg("Lo que tienes copiado no parece un link.");

      setUrl(normalizeUrl(text));
      setClipHint(null);
      setMsg("Listo. Ahora toca Guardar ✅");
    } catch {
      setMsg("No pude leer el portapapeles. En iPhone: toca el input y selecciona “Pegar”.");
    }
  }

  async function save() {
    setMsg(null);
    const finalUrl = normalizeUrl(url);
    if (!finalUrl) return setMsg("Pega un link primero.");

    // validación básica real
    try {
      new URL(finalUrl);
    } catch {
      return setMsg("Ese link no parece válido. Revisa que empiece por https://");
    }

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

      // limpia query params para no re-guardar al refresh
      router.replace("/");
      setUrl("");
      setNote("");
      setClipHint(null);
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
        En iPhone: copia el enlace y pégalo aquí. En Android también puedes “Compartir” directo.
      </p>

      {!hasShared && clipHint && !url && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#f6f6f6", border: "1px solid #eee" }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
            Detecté un link en tu portapapeles:
          </div>
          <div style={{ fontSize: 13, wordBreak: "break-all", marginBottom: 10 }}>
            {clipHint}
          </div>
          <button
            onClick={() => { setUrl(clipHint); setClipHint(null); setMsg("Listo. Ahora toca Guardar ✅"); }}
            style={{ padding: 10, borderRadius: 12, border: "none", background: "black", color: "white", width: "100%" }}
          >
            Usar este link
          </button>
        </div>
      )}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega un link…"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
        />

        {!hasShared && (
          <button
            onClick={pasteFromClipboard}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd", background: "white" }}
          >
            Pegar del portapapeles
          </button>
        )}

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
        <p style={{ marginTop: 10, opacity: 0.7 }}>(Te llegó desde “Compartir” ✅)</p>
      )}
    </main>
  );
}
