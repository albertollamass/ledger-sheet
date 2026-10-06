// Service worker mínimo: permite instalar la PWA sin cachear nada,
// para no servir nunca una versión vieja de la app.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
