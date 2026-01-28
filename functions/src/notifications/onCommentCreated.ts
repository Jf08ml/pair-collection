// functions/src/notifications/onCommentCreated.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendPushToTokens, cleanupInvalidTokens } from "../utils/sendPushNotification";

export const onCommentCreated = onDocumentCreated(
  "couples/{coupleId}/items/{itemId}/comments/{commentId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const { coupleId, itemId, commentId } = event.params;
    const comment = snapshot.data();
    const authorUid = comment.authorId;

    if (!authorUid) return;

    // Obtener el item para contexto
    const itemDoc = await admin
      .firestore()
      .doc(`couples/${coupleId}/items/${itemId}`)
      .get();

    const item = itemDoc.data();

    // Obtener couple members
    const coupleDoc = await admin.firestore().doc(`couples/${coupleId}`).get();

    const couple = coupleDoc.data();
    const members: string[] = couple?.members || [];
    const partnerUid = members.find((uid) => uid !== authorUid);

    if (!partnerUid) return;

    // Obtener partner data
    const partnerDoc = await admin.firestore().doc(`users/${partnerUid}`).get();

    const partnerData = partnerDoc.data();
    const tokens: string[] = partnerData?.fcmTokens || [];
    const prefs = partnerData?.notificationPreferences;

    if (prefs?.comments === false) return;
    if (tokens.length === 0) return;

    // Nombre del autor
    const authorProfile = await admin
      .firestore()
      .doc(`users/${authorUid}/public/profile`)
      .get();

    const authorName =
      authorProfile.data()?.nickname ||
      authorProfile.data()?.displayName ||
      "Tu pareja";

    // Texto del comentario (truncado)
    const commentText =
      comment.text?.substring(0, 50) + (comment.text?.length > 50 ? "..." : "");

    const result = await sendPushToTokens(tokens, {
      title: `${authorName} comentó`,
      body: commentText || "Nuevo comentario",
      data: {
        type: "comment",
        itemId,
        coupleId,
        url:
          item?.collectionId === "INBOX"
            ? "/"
            : `/collections/${item?.collectionId}`,
        tag: `comment_${commentId}`,
      },
    });

    if (result.failedTokens.length > 0) {
      await cleanupInvalidTokens(partnerUid, result.failedTokens);
    }
  }
);
