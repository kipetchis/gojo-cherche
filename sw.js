// Gojo cherche ! — service worker
// Augmente ce numéro à chaque mise à jour importante pour vider l'ancien cache.
const VERSION = 'gojo-v1';

const COQUILLE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

const BIBLIOTHEQUE = 'https://cdn.jsdelivr.net/npm/exifr@7/dist/full.umd.js';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(COQUILLE).then(() => c.add(BIBLIOTHEQUE).catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // La page : réseau d'abord (pour avoir les mises à jour), cache si hors ligne
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(rep => {
          const copie = rep.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copie));
          return rep;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fichiers de l'appli et bibliothèque photo : cache d'abord
  if (url.origin === self.location.origin || req.url === BIBLIOTHEQUE) {
    e.respondWith(
      caches.match(req).then(enCache => enCache || fetch(req).then(rep => {
        if (rep.ok) {
          const copie = rep.clone();
          caches.open(VERSION).then(c => c.put(req, copie));
        }
        return rep;
      }))
    );
  }
  // Tout le reste (DNS, archives, Worker…) passe directement par le réseau
});
