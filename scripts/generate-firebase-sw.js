// Script para generar firebase-messaging-sw.js con variables de entorno
const fs = require("fs");
const path = require("path");

// Cargar variables de entorno desde .env.local si existe
require("dotenv").config({ path: ".env.local" });

const swContent = `// Service Worker para Firebase Cloud Messaging
// Este archivo se genera automaticamente - NO EDITAR DIRECTAMENTE
// Edita scripts/generate-firebase-sw.js en su lugar

importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
  authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Background message received:",
    payload
  );

  const notificationTitle = payload.notification?.title || "Pair Collection";
  const notificationOptions = {
    body: payload.notification?.body || "Tienes una nueva actualizacion",
    icon: "/logo.png",
    badge: "/logo.png",
    tag: payload.data?.tag || "default",
    data: payload.data,
    requireInteraction: false,
    actions: [
      { action: "open", title: "Abrir" },
      { action: "dismiss", title: "Descartar" },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click:", event);

  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});
`;

const outputPath = path.join(__dirname, "../public/firebase-messaging-sw.js");
fs.writeFileSync(outputPath, swContent);
console.log("firebase-messaging-sw.js generated successfully");
