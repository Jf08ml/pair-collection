"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCommentCreated = void 0;
// functions/src/notifications/onCommentCreated.ts
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const sendPushNotification_1 = require("../utils/sendPushNotification");
exports.onCommentCreated = (0, firestore_1.onDocumentCreated)("couples/{coupleId}/items/{itemId}/comments/{commentId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const { coupleId, itemId, commentId } = event.params;
    const comment = snapshot.data();
    const authorUid = comment.authorId;
    if (!authorUid)
        return;
    // Obtener el item para contexto
    const itemDoc = await admin
        .firestore()
        .doc(`couples/${coupleId}/items/${itemId}`)
        .get();
    const item = itemDoc.data();
    // Obtener couple members
    const coupleDoc = await admin.firestore().doc(`couples/${coupleId}`).get();
    const couple = coupleDoc.data();
    const members = couple?.members || [];
    const partnerUid = members.find((uid) => uid !== authorUid);
    if (!partnerUid)
        return;
    // Obtener partner data
    const partnerDoc = await admin.firestore().doc(`users/${partnerUid}`).get();
    const partnerData = partnerDoc.data();
    const tokens = partnerData?.fcmTokens || [];
    const prefs = partnerData?.notificationPreferences;
    if (prefs?.comments === false)
        return;
    if (tokens.length === 0)
        return;
    // Nombre del autor
    const authorProfile = await admin
        .firestore()
        .doc(`users/${authorUid}/public/profile`)
        .get();
    const authorName = authorProfile.data()?.nickname ||
        authorProfile.data()?.displayName ||
        "Tu pareja";
    // Texto del comentario (truncado)
    const commentText = comment.text?.substring(0, 50) + (comment.text?.length > 50 ? "..." : "");
    const result = await (0, sendPushNotification_1.sendPushToTokens)(tokens, {
        title: `${authorName} comentó`,
        body: commentText || "Nuevo comentario",
        data: {
            type: "comment",
            itemId,
            coupleId,
            url: item?.collectionId === "INBOX"
                ? "/"
                : `/collections/${item?.collectionId}`,
            tag: `comment_${commentId}`,
        },
    });
    if (result.failedTokens.length > 0) {
        await (0, sendPushNotification_1.cleanupInvalidTokens)(partnerUid, result.failedTokens);
    }
});
//# sourceMappingURL=onCommentCreated.js.map