const APP_VERSION = "v5";
const STATIC_CACHE = `vocab-static-${APP_VERSION}`;
const RUNTIME_CACHE = `vocab-runtime-${APP_VERSION}`;
const OFFLINE_URL = "./template/offline.html";

const APP_SHELL = [
  "./",
  "./index.html",
  "./template/vocabulary-card.html",
  "./template/word-matching.html",
  "./template/multiple-choice.html",
  OFFLINE_URL,
  "./manifest.webmanifest",
  "./static/js/index.js",
  "./static/js/chapter-modal.js",
  "./static/js/vocabulary-card.js",
  "./static/js/word-matching.js",
  "./static/js/multiple-choice.js",
  "./static/js/pwa.js",
  "./static/data/list.json",
  "./static/data/第一章-covid-19.json",
  "./static/data/第二章-特斯拉.json",
  "./static/data/第三章-tablet.json",
  "./static/data/第四章-touchscreen.json",
  "./static/data/第五章-Unmanned Aerial Vehicle.json",
  "./static/icons/icon-192.svg",
  "./static/icons/icon-512.svg"
];

const NETWORK_FIRST_PATHS = [
  "/static/data/"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (NETWORK_FIRST_PATHS.some((path) => url.pathname.includes(path))) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) {
      return cached;
    }

    return caches.match(OFFLINE_URL);
  }
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || caches.match(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkResponse = await fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || networkResponse || caches.match(request);
}
