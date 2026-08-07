// Service Worker — Eve's Pottery push notifications
self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: "Eve's Pottery", body: event.data ? event.data.text() : "" }; }
  var title = data.title || "Eve's Pottery";
  var options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/badge.png",
    data: { url: data.url || "https://clases.evespottery.com" },
    vibrate: [100, 50, 100]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "https://clases.evespottery.com";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) { if (list[i].url === url && "focus" in list[i]) return list[i].focus(); }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
