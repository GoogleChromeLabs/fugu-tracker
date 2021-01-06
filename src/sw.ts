import { staticResourceCache, imageCache, offlineFallback } from 'workbox-recipes';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { precacheAndRoute } from 'workbox-precaching';

// Replaced with injected manifest
const files = self.__WB_MANIFEST;

const html = files
  .filter((f) => f.url.endsWith('.html') && f.url !== 'offline.html')
  .map((f) => {
    let path = `/${f.url}`.replace('/index.html', '/');
    if (path.endsWith('/') && path.length > 1) {
      return path.slice(0, -1);
    }
    return path;
  });
const images = files.filter((f) => f.url.endsWith('.svg') || f.url.endsWith('.png')).map((f) => `/${f.url}`);
const assets = files.filter((f) => f.url.endsWith('.css') || f.url.endsWith('.js') || f.url.endsWith('.json')).map((f) => `/${f.url}`);
const offline = files.filter((f) => f.url === 'offline.html');

// Precache ans route the offline page.
precacheAndRoute(offline);

// Handle install
self.addEventListener('install', (event) => {
  self.skipWaiting();

  const allCaches = [caches.open('pages').then((cache) => cache.addAll(html)), caches.open('static-resources').then((cache) => cache.addAll(assets)), caches.open('images').then((cache) => cache.addAll(images))];

  event.waitUntil(Promise.all(allCaches));
});

/**
 * Normalizes URLs to remove trailing slashes and query params
 * @param {object} param0 - A fetch event
 * @return {Request}
 */
async function normalizeURL({ request }) {
  const url = new URL(request.url);
  let cleanURL = url.origin + url.pathname;
  if (cleanURL.endsWith('/')) {
    cleanURL = cleanURL.slice(0, -1);
  }
  return new Request(cleanURL);
}

// Navigation routing is handled differently because a custom plugin need to be injected
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    networkTimeoutSeconds: 3,
    cacheName: 'pages',
    plugins: [
      {
        cacheKeyWillBeUsed: normalizeURL,
        requestWillFetch: normalizeURL,
      },
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
);

// Set up routing
staticResourceCache();
imageCache();
offlineFallback();
