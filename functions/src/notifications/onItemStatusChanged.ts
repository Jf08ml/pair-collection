// functions/src/notifications/onItemStatusChanged.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {
  sendPushToTokens,
  cleanupInvalidTokens,
  getDomain,
} from "../utils/sendPushNotification";

export const onItemStatusChanged = onDocumentUpdated(
  "couples/{coupleId}/items/{itemId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return;

    const { coupleId, itemId } = event.params;

    // Solo notificar si cambio de pending a done
    if (beforeData.status === afterData.status) return;
    if (afterData.status !== "done") return;

    // Notificamos al creador original cuando alguien marca como hecho
    const creatorUid = afterData.createdBy;
    if (!creatorUid) return;

    // Obtener couple
    const coupleDoc = await admin.firestore().doc(`couples/${coupleId}`).get();

    const couple = coupleDoc.data();
    const members: string[] = couple?.members || [];

    // Encontrar quien completo (el que no es el creador)
    const completedByUid = members.find((uid) => uid !== creatorUid);

    if (!completedByUid) return;

    // Notificar al creador que su pareja completo el item
    const creatorDoc = await admin.firestore().doc(`users/${creatorUid}`).get();

    const creatorData = creatorDoc.data();
    const tokens: string[] = creatorData?.fcmTokens || [];
    const prefs = creatorData?.notificationPreferences;

    if (prefs?.itemCompleted === false) return;
    if (tokens.length === 0) return;

    // Nombre del que completo
    const completerProfile = await admin
      .firestore()
      .doc(`users/${completedByUid}/public/profile`)
      .get();

    const completerName =
      completerProfile.data()?.nickname ||
      completerProfile.data()?.displayName ||
      "Tu pareja";

    const itemTitle = afterData.title || getDomain(afterData.url) || "un link";

    const result = await sendPushToTokens(tokens, {
      title: "Item completado",
      body: `${completerName} marcó "${itemTitle}" como hecho`,
      data: {
        type: "item_completed",
        itemId,
        coupleId,
        url:
          afterData.collectionId === "INBOX"
            ? "/"
            : `/collections/${afterData.collectionId}`,
        tag: `completed_${itemId}`,
      },
    });

    if (result.failedTokens.length > 0) {
      await cleanupInvalidTokens(creatorUid, result.failedTokens);
    }
  }
);
