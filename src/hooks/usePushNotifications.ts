// src/hooks/usePushNotifications.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "../context/UserProvider";
import {
  isPushSupported,
  getPermissionStatus,
  requestPermissionAndGetToken,
  getCurrentToken,
  setupForegroundListener,
  NotificationPermissionStatus,
} from "../lib/fcm";
import {
  saveFcmToken,
  removeFcmToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  isTokenSaved,
  NotificationPreferences,
} from "../lib/notifications";

type UsePushNotificationsReturn = {
  // Estado
  isSupported: boolean;
  permissionStatus: NotificationPermissionStatus;
  isLoading: boolean;
  preferences: NotificationPreferences | null;

  // Acciones
  requestPermission: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;

  // Foreground message callback
  lastForegroundMessage: { title?: string; body?: string } | null;
};

export function usePushNotifications(): UsePushNotificationsReturn {
  const { fbUser } = useUser();
  const uid = fbUser?.uid;

  const [isSupported] = useState(() => isPushSupported());
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>("default");
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [lastForegroundMessage, setLastForegroundMessage] = useState<{
    title?: string;
    body?: string;
  } | null>(null);

  // Inicializar estado
  useEffect(() => {
    const init = async () => {
      setPermissionStatus(getPermissionStatus());

      if (uid) {
        const prefs = await getNotificationPreferences(uid);
        setPreferences(prefs);

        // Si ya tiene permisos, verificar/actualizar token
        if (getPermissionStatus() === "granted") {
          const token = await getCurrentToken();
          if (token) {
            const saved = await isTokenSaved(uid, token);
            if (!saved) {
              await saveFcmToken(uid, token);
            }
          }
        }
      }

      setIsLoading(false);
    };

    init();
  }, [uid]);

  // Setup foreground listener
  useEffect(() => {
    if (!isSupported || permissionStatus !== "granted") return;

    let unsubscribe: (() => void) | null = null;

    setupForegroundListener((payload) => {
      setLastForegroundMessage({
        title: payload.title,
        body: payload.body,
      });

      // Mostrar notificación nativa en foreground (opcional)
      if (Notification.permission === "granted" && payload.title) {
        new Notification(payload.title, {
          body: payload.body,
          icon: "/logo.png",
        });
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      unsubscribe?.();
    };
  }, [isSupported, permissionStatus]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!uid || !isSupported) return false;

    setIsLoading(true);
    try {
      const token = await requestPermissionAndGetToken();

      if (token) {
        await saveFcmToken(uid, token);
        setPermissionStatus("granted");
        return true;
      }

      setPermissionStatus(getPermissionStatus());
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [uid, isSupported]);

  const disableNotifications = useCallback(async () => {
    if (!uid) return;

    setIsLoading(true);
    try {
      const token = await getCurrentToken();
      if (token) {
        await removeFcmToken(uid, token);
      }
      // Nota: No podemos revocar el permiso del navegador programáticamente
      // Solo podemos eliminar el token de Firestore
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  const updatePrefs = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      if (!uid) return;

      await updateNotificationPreferences(uid, prefs);
      setPreferences((prev) => (prev ? { ...prev, ...prefs } : null));
    },
    [uid]
  );

  return {
    isSupported,
    permissionStatus,
    isLoading,
    preferences,
    requestPermission,
    disableNotifications,
    updatePreferences: updatePrefs,
    lastForegroundMessage,
  };
}
