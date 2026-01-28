// src/lib/fcm.ts
// Cliente Firebase Cloud Messaging - permisos y tokens

import { getToken, onMessage } from "firebase/messaging";
import { getMessagingInstance } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export type NotificationPermissionStatus =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

/**
 * Verifica si el navegador soporta notificaciones push
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Obtiene el estado actual del permiso de notificaciones
 */
export function getPermissionStatus(): NotificationPermissionStatus {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Registra el Service Worker de Firebase Messaging
 */
async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    console.log("FCM Service Worker registered:", registration);
    return registration;
  } catch (error) {
    console.error("FCM Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Solicita permiso y obtiene el token FCM
 * Retorna el token si se concede permiso, null si se deniega
 */
export async function requestPermissionAndGetToken(): Promise<string | null> {
  if (!isPushSupported()) {
    console.warn("Push notifications not supported");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    // Registrar el SW de FCM
    const registration = await registerFcmServiceWorker();
    if (!registration) return null;

    // Esperar a que el SW esté activo
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log("FCM Token obtained:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

/**
 * Obtiene el token actual sin solicitar permisos
 * Útil para refrescar tokens periódicamente
 */
export async function getCurrentToken(): Promise<string | null> {
  if (getPermissionStatus() !== "granted") return null;

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    // Registrar el SW si no está registrado
    const registration = await registerFcmServiceWorker();
    if (!registration) return null;

    await navigator.serviceWorker.ready;

    return await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (error) {
    console.error("Error getting current FCM token:", error);
    return null;
  }
}

/**
 * Listener para mensajes en foreground (cuando la app está abierta)
 */
export async function setupForegroundListener(
  callback: (payload: {
    title?: string;
    body?: string;
    data?: Record<string, string>;
  }) => void
): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);

    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
    });
  });
}
