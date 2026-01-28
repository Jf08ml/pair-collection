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
exports.sendPushToTokens = sendPushToTokens;
exports.cleanupInvalidTokens = cleanupInvalidTokens;
exports.getDomain = getDomain;
// functions/src/utils/sendPushNotification.ts
const admin = __importStar(require("firebase-admin"));
/**
 * Envia notificacion push a multiples tokens
 * Retorna tokens invalidos para limpiar de Firestore
 */
async function sendPushToTokens(tokens, payload) {
    if (tokens.length === 0) {
        return { successCount: 0, failedTokens: [] };
    }
    const message = {
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
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
        if (!resp.success) {
            const error = resp.error;
            // Tokens invalidos o expirados
            if (error?.code === "messaging/invalid-registration-token" ||
                error?.code === "messaging/registration-token-not-registered") {
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
async function cleanupInvalidTokens(uid, invalidTokens) {
    if (invalidTokens.length === 0)
        return;
    const userRef = admin.firestore().doc(`users/${uid}`);
    await userRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
    });
    console.log(`Cleaned ${invalidTokens.length} invalid tokens for user ${uid}`);
}
/**
 * Helper para obtener dominio de una URL
 */
function getDomain(url) {
    try {
        if (!url)
            return "";
        const u = new URL(url);
        return u.hostname.replace(/^www\./, "");
    }
    catch {
        return "";
    }
}
//# sourceMappingURL=sendPushNotification.js.map