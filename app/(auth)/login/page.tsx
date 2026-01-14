"use client";

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/navigation";

import { useEffect } from "react";
import { useUser } from "../../context/UserProvider";

export default function LoginPage() {
  const router = useRouter();
  const { fbUser, userDoc, loading } = useUser();

  useEffect(() => {
    if (loading) return;
    if (fbUser) {
      if (userDoc?.coupleId) router.replace("/");
      else router.replace("/pair");
    }
  }, [loading, fbUser, userDoc?.coupleId, router]);

  async function loginGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          border: "1px solid #ddd",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <h1 style={{ margin: 0 }}>Pair Collection</h1>
        <p style={{ marginTop: 8 }}>Inicia sesión para empezar.</p>
        <button
          onClick={loginGoogle}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            marginTop: 12,
          }}
        >
          Continuar con Google
        </button>
      </div>
    </main>
  );
}
