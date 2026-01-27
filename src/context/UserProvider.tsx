/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User as FbUser, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { ensureUserDoc } from "../lib/user";

type AppUserDoc = {
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  coupleId: string | null;
  pendingInviteCode?: string | null;
};

type UserContextValue = {
  fbUser: FbUser | null;
  userDoc: AppUserDoc | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [fbUser, setFbUser] = useState<FbUser | null>(null);
  const [userDoc, setUserDoc] = useState<AppUserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: null | (() => void) = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      // limpiar listener anterior si existía
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      setFbUser(u);

      if (!u) {
        setUserDoc(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      await ensureUserDoc({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
      });

      const ref = doc(db, "users", u.uid);
      unsubDoc = onSnapshot(
        ref,
        (snap) => {
          const data = snap.data() as any;
          setUserDoc({
            displayName: data?.displayName ?? null,
            photoURL: data?.photoURL ?? null,
            email: data?.email ?? null,
            coupleId: data?.coupleId ?? null,
            pendingInviteCode: data?.pendingInviteCode ?? null,
          });
          setLoading(false);
        },
        () => setLoading(false)
      );
    });

    return () => {
      if (unsubDoc) unsubDoc();
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (!fbUser || !userDoc) return;
    if (userDoc.coupleId) return; // ya tiene pareja
    const code = userDoc.pendingInviteCode;
    if (!code) return;

    const inviteRef = doc(db, "invites", code);

    const unsub = onSnapshot(inviteRef, async (snap) => {
      if (!snap.exists()) return;
      const invite = snap.data() as any;

      if (invite.status === "claimed" && invite.coupleId) {
        // Set coupleId y limpiar pendingInviteCode
        await setDoc(
          doc(db, "users", fbUser.uid),
          { coupleId: invite.coupleId, pendingInviteCode: null },
          { merge: true }
        );
      }

      if (invite.status === "expired") {
        // Limpia pending si expiró
        await setDoc(
          doc(db, "users", fbUser.uid),
          { pendingInviteCode: null },
          { merge: true }
        );
      }
    });

    return () => unsub();
  }, [fbUser, userDoc]);

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({ fbUser, userDoc, loading, logout }),
    [fbUser, userDoc, loading]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
