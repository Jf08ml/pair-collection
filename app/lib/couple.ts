/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

type CoupleDoc = { members: string[]; title?: string; since?: any };

type PublicProfile = {
  uid: string;
  nickname: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export function useCouplePublicProfiles(coupleId: string | null) {
  const [couple, setCouple] = useState<CoupleDoc | null>(null);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(!!coupleId);

  useEffect(() => {
    if (!coupleId) {
      setCouple(null);
      setProfiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const coupleRef = doc(db, "couples", coupleId);

    let unsubProfiles: Array<() => void> = [];

    const unsubCouple = onSnapshot(
      coupleRef,
      (snap) => {
        if (!snap.exists()) {
          setCouple(null);
          setProfiles([]);
          setLoading(false);
          return;
        }

        const c = snap.data() as CoupleDoc;
        setCouple(c);

        unsubProfiles.forEach((u) => u());
        unsubProfiles = [];

        const uids = (c.members ?? []).filter(Boolean);
        const next: Record<string, PublicProfile> = {};

        uids.forEach((uid) => {
          const pref = doc(db, "users", uid, "public", "profile");
          const unsub = onSnapshot(pref, (ps) => {
            const p = (ps.data() as any) ?? {};
            next[uid] = {
              uid,
              nickname: p.nickname ?? null,
              displayName: p.displayName ?? null,
              photoURL: p.photoURL ?? null,
            };
            setProfiles(uids.map((id) => next[id]).filter(Boolean));
            setLoading(false);
          });
          unsubProfiles.push(unsub);
        });
      },
      () => setLoading(false)
    );

    return () => {
      unsubProfiles.forEach((u) => u());
      unsubCouple();
    };
  }, [coupleId]);

  return useMemo(() => ({ couple, profiles, loading }), [couple, profiles, loading]);
}
