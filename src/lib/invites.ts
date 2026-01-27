/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

function random6Digits() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeCode(code: string) {
  return code.replace(/\D/g, "").slice(0, 6);
}

/**
 * Crea un invite con docId = code (6 dígitos).
 * Reintenta si hay colisión.
 */
export async function createInvite(creatorUid: string, creatorName?: string) {
  const MAX_TRIES = 8;
  const ttlMinutes = 20;

  for (let i = 0; i < MAX_TRIES; i++) {
    const code = random6Digits();
    const inviteRef = doc(db, "invites", code);
    const userRef = doc(db, "users", creatorUid);

    const res = await runTransaction(db, async (tx) => {
      const snap = await tx.get(inviteRef);
      if (snap.exists()) return null;

      const userSnap = await tx.get(userRef);
      const coupleId = userSnap.data()?.coupleId ?? null;
      if (coupleId)
        throw new Error("Ya tienes pareja. No puedes crear código.");

      const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

      tx.set(inviteRef, {
        code,
        creatorUid,
        creatorName: creatorName || null,
        status: "open",
        createdAt: serverTimestamp(),
        expiresAt,
        claimedByUid: null,
        coupleId: null,
      });

      // 🔥 Marca en el usuario el invite pendiente
      tx.set(userRef, { pendingInviteCode: code }, { merge: true });

      return { code, expiresAt };
    });

    if (res) return res;
  }

  throw new Error("No se pudo generar un código, intenta de nuevo.");
}

/**
 * Une al usuario joinerUid a la pareja del creador del código.
 * Transacción:
 * - valida invite (open, no expirado)
 * - valida que ninguno tenga pareja
 * - crea couples/{coupleId}
 * - actualiza users/{uid}.coupleId para ambos
 * - marca invite como claimed
 */
export async function joinWithCode(joinerUid: string, code: string) {
  const clean = normalizeCode(code);
  if (clean.length !== 6) throw new Error("Código inválido.");

  const inviteRef = doc(db, "invites", clean);

  return await runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) throw new Error("Código no existe.");

    const invite = inviteSnap.data() as any;

    if (invite.status !== "open") throw new Error("Este código ya fue usado.");
    if (invite.creatorUid === joinerUid) throw new Error("No puedes unirte a tu propio código.");

    // expiración (Date o Timestamp)
    const expiresAt: Date | null =
      invite.expiresAt?.toDate?.() ?? invite.expiresAt ?? null;

    if (expiresAt && expiresAt.getTime() < Date.now()) {
      tx.update(inviteRef, { status: "expired" });
      throw new Error("Código expirado.");
    }

    // Validar que EL JOINER no tenga pareja (solo lees tu doc -> permitido)
    const joinerUserRef = doc(db, "users", joinerUid);
    const joinerUserSnap = await tx.get(joinerUserRef);
    const joinerCoupleId = joinerUserSnap.data()?.coupleId ?? null;
    if (joinerCoupleId) throw new Error("Tú ya tienes pareja.");

    // Crear couple
    const coupleRef = doc(collection(db, "couples"));
    tx.set(coupleRef, {
      members: [invite.creatorUid, joinerUid],
      createdAt: serverTimestamp(),
      inviteCode: clean,
    });

    // Setear coupleId SOLO al joiner
    tx.set(joinerUserRef, { coupleId: coupleRef.id }, { merge: true });

    // Claim invite para que el creador lo detecte y se auto-asigne (Opción 2)
    tx.update(inviteRef, {
      status: "claimed",
      claimedByUid: joinerUid,
      coupleId: coupleRef.id,
    });

    return { coupleId: coupleRef.id };
  });
}
