import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function ensureUserDoc(params: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}) {
  const ref = doc(db, "users", params.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      email: params.email ?? null,
      displayName: params.displayName ?? null,
      photoURL: params.photoURL ?? null,
      coupleId: null,
      pendingInviteCode: null,
      createdAt: serverTimestamp(),
    });
  } else {
    await setDoc(
      ref,
      {
        email: params.email ?? null,
        displayName: params.displayName ?? null,
        photoURL: params.photoURL ?? null,
      },
      { merge: true }
    );
  }

  // ✅ Perfil público (visible para la pareja)
  const publicProfileRef = doc(db, "users", params.uid, "public", "profile");
  const publicSnap = await getDoc(publicProfileRef);

  if (!publicSnap.exists()) {
    await setDoc(
      publicProfileRef,
      {
        nickname: null,
        displayName: params.displayName ?? null,
        photoURL: params.photoURL ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    // mantiene displayName/photoURL como fallback actualizado (sin tocar nickname)
    await setDoc(
      publicProfileRef,
      {
        displayName: params.displayName ?? null,
        photoURL: params.photoURL ?? null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function updateNickname(uid: string, nickname: string) {
  const value = nickname.trim();
  await setDoc(
    doc(db, "users", uid, "public", "profile"),
    {
      nickname: value.length ? value : null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
