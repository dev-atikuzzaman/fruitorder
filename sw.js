/* ফলহাট — সার্ভিস ওয়ার্কার
   অ্যাপ-শেল (HTML/CSS/JS/আইকন) ক্যাশ করে অফলাইনেও অ্যাপটি খোলা যায়।
   Firestore-এর রিয়েল-টাইম ডেটার জন্য সবসময় ইন্টারনেট সংযোগ লাগবে। */

const CACHE_NAME = "folhaat-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/firebase-config.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/mango-symbol.png",
  "./icons/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Firestore/Firebase ও বাইরের সব রিকোয়েস্ট সরাসরি নেটওয়ার্কে পাঠানো হয়,
  // ক্যাশ করার চেষ্টা করা হয় না — শুধু নিজস্ব অ্যাপ-শেল ফাইলগুলো ক্যাশ হয়।
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      }).catch(() => cached);
    })
  );
});
