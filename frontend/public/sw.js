// Flopi San — Service Worker
const CACHE = 'flopi-v2'
const STATIC = ['/', '/daily', '/manifest.json', '/logo.jpg']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})

// Push notifications (trimise din app via showNotification)
self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'Flopi San', body: 'Pick-uri noi disponibile!' }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    tag: 'flopi-daily',
    data: { url: '/daily' },
    actions: [{ action: 'open', title: 'Vezi pick-urile' }],
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/daily'
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) { if (c.url.includes(url) && 'focus' in c) return c.focus() }
    return clients.openWindow(url)
  }))
})
