// functions/src/index.ts
import * as admin from "firebase-admin";

// Inicializar Firebase Admin
admin.initializeApp();

// Exportar todas las funciones de notificaciones
export { onItemCreated } from "./notifications/onItemCreated";
export { onCommentCreated } from "./notifications/onCommentCreated";
export { onItemStatusChanged } from "./notifications/onItemStatusChanged";
