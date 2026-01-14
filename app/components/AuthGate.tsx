"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserProvider";


export function AuthGate({
  children,
  requireCouple = false,
}: {
  children: React.ReactNode;
  requireCouple?: boolean;
}) {
  const router = useRouter();
  const { fbUser, userDoc, loading } = useUser();

  useEffect(() => {
    if (loading) return;

    if (!fbUser) {
      router.replace("/login");
      return;
    }

    if (requireCouple && !userDoc?.coupleId) {
      router.replace("/pair");
      return;
    }
  }, [loading, fbUser, userDoc?.coupleId, requireCouple, router]);

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (!fbUser) return null;
  if (requireCouple && !userDoc?.coupleId) return null;

  return <>{children}</>;
}
