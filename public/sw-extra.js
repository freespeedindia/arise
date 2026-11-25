// Opens (or focuses) Arise when a reminder notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (all.length) return all[0].focus()
    return self.clients.openWindow(self.registration.scope)
  })())
})
