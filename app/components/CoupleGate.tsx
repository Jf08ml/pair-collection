"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserProvider";
import { AppLoader } from "./AppLoader";

export function CoupleGate({
  mode,
  children,
}: {
  mode: "requireCouple" | "requireNoCouple";
  children: React.ReactNode;
}) {
  const { fbUser, userDoc, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!fbUser) {
      router.replace("/login");
      return;
    }

    const hasCouple = !!userDoc?.coupleId;

    if (mode === "requireCouple" && !hasCouple) {
      router.replace("/pair");
    }

    if (mode === "requireNoCouple" && hasCouple) {
      router.replace("/");
    }
  }, [fbUser, userDoc, loading, mode, router]);

  if (loading) {
    return <AppLoader />;
  }

  return <>{children}</>;
}
