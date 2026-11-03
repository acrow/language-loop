// Language Loop Service Worker
// Bump CACHE_NAME whenever you deploy changes so clients pick up new assets.
const CACHE_NAME = 'language-loop-v8';

const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/constants.js',
    './js/events.js',
    './js/logic.js',
    './js/dialog.js',
    './js/languages.js',
    './js/storage.js',
    './js/i18n.js',
    './js/translation.js',
    './js/welcome.js',
    './js/test.js',
    './js/audio.js',
    './js/playlist.js',
    './js/ui.js',
    './js/ui-library.js',
    './js/ui-editor.js',
    './js/ui-test.js',
    './js/ui-cloud.js',
    './js/app.js',
    './js/cloud.js',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/logo.gif',
    './i18n/en-US.json',
    './i18n/zh-CN.json',
    './i18n/zh-TW.json',
    './i18n/zh-HK.json',
    './i18n/ja-JP.json',
    './i18n/es-ES.json',
    './i18n/fr-FR.json',
    './i18n/de-DE.json',
    './i18n/ko-KR.json',
    './i18n/it-IT.json'
];

// Install event - cache all local resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .catch((error) => console.log('Cache install error:', error))
    );
    self.skipWaiting();
});

// Activate event - remove old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only handle GET requests over http(s)
    if (request.method !== 'GET' || !request.url.startsWith('http')) {
        return;
    }

    // Never intercept cross-origin requests (Firebase, fonts, translation API)
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    // Navigation requests: network-first, fall back to cached index.html
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((r) => r || caches.match('./index.html')))
        );
        return;
    }

    // Static assets: network-first with cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
