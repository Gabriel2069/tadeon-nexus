const CACHE_NAME = "tadeon-nexus-static-v1";
const PUBLIC_FILES = ["/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PUBLIC_FILES))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isPublicAsset =
    request.method === "GET" &&
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/assets/") || PUBLIC_FILES.includes(url.pathname));

  if (!isPublicAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
