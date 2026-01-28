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
exports.onItemStatusChanged = void 0;
// functions/src/notifications/onItemStatusChanged.ts
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const sendPushNotification_1 = require("../utils/sendPushNotification");
exports.onItemStatusChanged = (0, firestore_1.onDocumentUpdated)("couples/{coupleId}/items/{itemId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    const { coupleId, itemId } = event.params;
    // Solo notificar si cambio de pending a done
    if (beforeData.status === afterData.status)
        return;
    if (afterData.status !== "done")
        return;
    // Notificamos al creador original cuando alguien marca como hecho
    const creatorUid = afterData.createdBy;
    if (!creatorUid)
        return;
    // Obtener couple
    const coupleDoc = await admin.firestore().doc(`couples/${coupleId}`).get();
    const couple = coupleDoc.data();
    const members = couple?.members || [];
    // Encontrar quien completo (el que no es el creador)
    const completedByUid = members.find((uid) => uid !== creatorUid);
    if (!completedByUid)
        return;
    // Notificar al creador que su pareja completo el item
    const creatorDoc = await admin.firestore().doc(`users/${creatorUid}`).get();
    const creatorData = creatorDoc.data();
    const tokens = creatorData?.fcmTokens || [];
    const prefs = creatorData?.notificationPreferences;
    if (prefs?.itemCompleted === false)
        return;
    if (tokens.length === 0)
        return;
    // Nombre del que completo
    const completerProfile = await admin
        .firestore()
        .doc(`users/${completedByUid}/public/profile`)
        .get();
    const completerName = completerProfile.data()?.nickname ||
        completerProfile.data()?.displayName ||
        "Tu pareja";
    const itemTitle = afterData.title || (0, sendPushNotification_1.getDomain)(afterData.url) || "un link";
    const result = await (0, sendPushNotification_1.sendPushToTokens)(tokens, {
        title: "Item completado",
        body: `${completerName} marcó "${itemTitle}" como hecho`,
        data: {
            type: "item_completed",
            itemId,
            coupleId,
            url: afterData.collectionId === "INBOX"
                ? "/"
                : `/collections/${afterData.collectionId}`,
            tag: `completed_${itemId}`,
        },
    });
    if (result.failedTokens.length > 0) {
        await (0, sendPushNotification_1.cleanupInvalidTokens)(creatorUid, result.failedTokens);
    }
});
//# sourceMappingURL=onItemStatusChanged.js.map