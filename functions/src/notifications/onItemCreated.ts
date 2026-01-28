// functions/src/notifications/onItemCreated.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {
  sendPushToTokens,
  cleanupInvalidTokens,
  getDomain,
} from "../utils/sendPushNotification";

export const onItemCreated = onDocumentCreated(
  "couples/{coupleId}/items/{itemId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const { coupleId, itemId } = event.params;
    const item = snapshot.data();
    const creatorUid = item.createdBy;

    if (!creatorUid) {
      console.log("No createdBy field, skipping notification");
      return;
    }

    // Obtener el couple para saber quien es la pareja
    const coupleDoc = await admin.firestore().doc(`couples/${coupleId}`).get();

    if (!coupleDoc.exists) {
      console.log("Couple not found");
      return;
    }

    const couple = coupleDoc.data();
    const members: string[] = couple?.members || [];

    // Encontrar el otro miembro (el que recibira la notificacion)
    const partnerUid = members.find((uid) => uid !== creatorUid);

    if (!partnerUid) {
      console.log("Partner not found");
      return;
    }

    // Obtener datos del partner
    const partnerDoc = await admin.firestore().doc(`users/${partnerUid}`).get();

    if (!partnerDoc.exists) {
      console.log("Partner user doc not found");
      return;
    }

    const partnerData = partnerDoc.data();
    const tokens: string[] = partnerData?.fcmTokens || [];
    const prefs = partnerData?.notificationPreferences;

    // Verificar preferencias
    if (prefs && prefs.newItems === false) {
      console.log("User has disabled newItems notifications");
      return;
    }

    if (tokens.length === 0) {
      console.log("No FCM tokens for partner");
      return;
    }

    // Obtener nombre del creador
    const creatorProfile = await admin
      .firestore()
      .doc(`users/${creatorUid}/public/profile`)
      .get();

    const creatorName =
      creatorProfile.data()?.nickname ||
      creatorProfile.data()?.displayName ||
      "Tu pareja";

    // Preparar notificacion
    const title = item.title || getDomain(item.url) || "Nuevo link";
    const body = `${creatorName} agregó un nuevo link`;

    const result = await sendPushToTokens(tokens, {
      title,
      body,
      data: {
        type: "new_item",
        itemId,
        coupleId,
        url:
          item.collectionId === "INBOX" ? "/" : `/collections/${item.collectionId}`,
        tag: `item_${itemId}`,
      },
    });

    // Limpiar tokens invalidos
    if (result.failedTokens.length > 0) {
      await cleanupInvalidTokens(partnerUid, result.failedTokens);
    }

    console.log(`Notification sent: ${result.successCount} success`);
  }
);
