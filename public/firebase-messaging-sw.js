// Service Worker para Firebase Cloud Messaging
// Este archivo debe estar en /public/ para ser accesible

importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js"
);

// Configuracion de Firebase (valores publicos, no secretos)
firebase.initializeApp({
  apiKey: "AIzaSyBeY3B7AgzMntYNmusWVwD18rwWxJQV24A",
  authDomain: "pair-collection.firebaseapp.com",
  projectId: "pair-collection",
  storageBucket: "pair-collection.appspot.com",
  messagingSenderId: "308812348416",
  appId: "1:308812348416:web:5255d9b6469e0340966ce5",
});

const messaging = firebase.messaging();

// Handler para mensajes en background (cuando la app esta cerrada o en segundo plano)
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

// Handler para clicks en notificacion
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click:", event);

  event.notification.close();

  // Si el usuario hizo click en "Descartar", no hacer nada
  if (event.action === "dismiss") return;

  // URL a abrir segun el tipo de notificacion
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Si ya hay una ventana abierta de la app, enfocarla y navegar
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        return clients.openWindow(urlToOpen);
      })
  );
});
