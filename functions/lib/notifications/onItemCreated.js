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
exports.onItemCreated = void 0;
// functions/src/notifications/onItemCreated.ts
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const sendPushNotification_1 = require("../utils/sendPushNotification");
exports.onItemCreated = (0, firestore_1.onDocumentCreated)("couples/{coupleId}/items/{itemId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
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
    const members = couple?.members || [];
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
    const tokens = partnerData?.fcmTokens || [];
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
    const creatorName = creatorProfile.data()?.nickname ||
        creatorProfile.data()?.displayName ||
        "Tu pareja";
    // Preparar notificacion
    const title = item.title || (0, sendPushNotification_1.getDomain)(item.url) || "Nuevo link";
    const body = `${creatorName} agregó un nuevo link`;
    const result = await (0, sendPushNotification_1.sendPushToTokens)(tokens, {
        title,
        body,
        data: {
            type: "new_item",
            itemId,
            coupleId,
            url: item.collectionId === "INBOX" ? "/" : `/collections/${item.collectionId}`,
            tag: `item_${itemId}`,
        },
    });
    // Limpiar tokens invalidos
    if (result.failedTokens.length > 0) {
        await (0, sendPushNotification_1.cleanupInvalidTokens)(partnerUid, result.failedTokens);
    }
    console.log(`Notification sent: ${result.successCount} success`);
});
//# sourceMappingURL=onItemCreated.js.map