// src/lib/notifications.ts
// Manejo de tokens FCM y preferencias de notificaciones en Firestore

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type NotificationPreferences = {
  newItems: boolean;
  comments: boolean;
  itemCompleted: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  newItems: true,
  comments: true,
  itemCompleted: true,
};

/**
 * Guarda el token FCM en el documento del usuario
 * Evita duplicados usando arrayUnion
 */
export async function saveFcmToken(uid: string, token: string): Promise<void> {
  const userRef = doc(db, "users", uid);

  await setDoc(
    userRef,
    {
      fcmTokens: arrayUnion(token),
      lastTokenUpdate: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Elimina un token FCM del usuario (logout o token inválido)
 */
export async function removeFcmToken(uid: string, token: string): Promise<void> {
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    fcmTokens: arrayRemove(token),
    lastTokenUpdate: serverTimestamp(),
  });
}

/**
 * Obtiene las preferencias de notificación del usuario
 */
export async function getNotificationPreferences(
  uid: string
): Promise<NotificationPreferences> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return DEFAULT_PREFERENCES;

  const data = snap.data();
  return {
    ...DEFAULT_PREFERENCES,
    ...data.notificationPreferences,
  };
}

/**
 * Actualiza las preferencias de notificación
 */
export async function updateNotificationPreferences(
  uid: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  const userRef = doc(db, "users", uid);
  const current = await getNotificationPreferences(uid);

  await setDoc(
    userRef,
    {
      notificationPreferences: {
        ...current,
        ...preferences,
      },
    },
    { merge: true }
  );
}

/**
 * Verifica si el token actual ya está guardado
 */
export async function isTokenSaved(uid: string, token: string): Promise<boolean> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return false;

  const tokens: string[] = snap.data().fcmTokens || [];
  return tokens.includes(token);
}
