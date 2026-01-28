// functions/src/utils/sendPushNotification.ts
import * as admin from "firebase-admin";

type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
};

type SendResult = {
  successCount: number;
  failedTokens: string[];
};

/**
 * Envia notificacion push a multiples tokens
 * Retorna tokens invalidos para limpiar de Firestore
 */
export async function sendPushToTokens(
  tokens: string[],
  payload: NotificationPayload
): Promise<SendResult> {
  if (tokens.length === 0) {
    return { successCount: 0, failedTokens: [] };
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl,
    },
    data: payload.data,
    webpush: {
      notification: {
        icon: "/logo.png",
        badge: "/logo.png",
        requireInteraction: false,
      },
      fcmOptions: {
        link: payload.data?.url || "/",
      },
    },
    android: {
      notification: {
        icon: "ic_notification",
        color: "#FF69B4",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  const failedTokens: string[] = [];

  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      const error = resp.error;
      // Tokens invalidos o expirados
      if (
        error?.code === "messaging/invalid-registration-token" ||
        error?.code === "messaging/registration-token-not-registered"
      ) {
        failedTokens.push(tokens[idx]);
      }
      console.error(`Error sending to token ${idx}:`, error);
    }
  });

  return {
    successCount: response.successCount,
    failedTokens,
  };
}

/**
 * Limpia tokens invalidos del documento del usuario
 */
export async function cleanupInvalidTokens(
  uid: string,
  invalidTokens: string[]
): Promise<void> {
  if (invalidTokens.length === 0) return;

  const userRef = admin.firestore().doc(`users/${uid}`);

  await userRef.update({
    fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
  });

  console.log(`Cleaned ${invalidTokens.length} invalid tokens for user ${uid}`);
}

/**
 * Helper para obtener dominio de una URL
 */
export function getDomain(url?: string): string {
  try {
    if (!url) return "";
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
