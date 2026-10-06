self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim()
  )
})

self.addEventListener('push', (event) => {
  let data = {}

  try {
    data = event.data
      ? event.data.json()
      : {}
  } catch {
    data = {
      title: 'VERITAS',
      body: 'You have a new notification.',
    }
  }

  const title =
    data.title || 'VERITAS'

  const options = {
    body:
      data.body ||
      'You have a new VERITAS notification.',
    icon:
      data.icon ||
      '/icon-192.png',
    badge:
      data.badge ||
      '/icon-192.png',
    tag:
      data.tag ||
      `veritas-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    data: {
      url:
        data.url ||
        '/notifications',
    },
  }

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  )
})

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close()

    const url =
      event.notification?.data?.url ||
      '/notifications'

    event.waitUntil(
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clients) => {
          for (const client of clients) {
            if ('focus' in client) {
              return client
                .navigate(url)
                .then(() => client.focus())
            }
          }

          if (
            self.clients.openWindow
          ) {
            return self.clients.openWindow(
              url
            )
          }

          return null
        })
    )
  }
)
