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
      createdAt: serverTimestamp(),
    });
  } else {
    // opcional: mantener datos actualizados sin pisar coupleId
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
}
