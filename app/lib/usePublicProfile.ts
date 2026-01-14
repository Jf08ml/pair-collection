/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type PublicProfile = {
  nickname: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export function usePublicProfile(uid: string | null) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!uid);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, "users", uid, "public", "profile");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const p = (snap.data() as any) ?? {};
        setProfile({
          nickname: p.nickname ?? null,
          displayName: p.displayName ?? null,
          photoURL: p.photoURL ?? null,
        });
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [uid]);

  const updateNickname = async (nickname: string) => {
    if (!uid) return;
    const value = nickname.trim();
    await setDoc(
      doc(db, "users", uid, "public", "profile"),
      {
        nickname: value.length ? value : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  return useMemo(
    () => ({ profile, loading, updateNickname }),
    [profile, loading]
  );
}
