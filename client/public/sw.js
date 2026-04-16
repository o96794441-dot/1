const CACHE_NAME = "chatapp-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

// Install — cache static assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (e) => {
  if (!e.request.url.startsWith("http")) return;
  // Skip API and socket requests — always go to network
  if (e.request.url.includes("/api/") || e.request.url.includes("socket.io")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// 🔔 Push Notification handler — fires even when app is closed
self.addEventListener("push", (e) => {
  let data = { title: "ChatApp", body: "You have a new message 💬" };
  try {
    data = e.data?.json() || data;
  } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "chatapp-message",
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || "/" },
    })
  );
});

// Notification click — focus or open the app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
