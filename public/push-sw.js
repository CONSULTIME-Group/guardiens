/* Push only: no fetch handler and no cache of pages or private data. */
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Generic notice below. */ }
  const application = payload && payload.body === 'Vous avez reçu une nouvelle candidature.';
  const body = application ? 'Vous avez reçu une nouvelle candidature.' : 'Vous avez un nouveau message.';
  const tag = typeof payload?.tag === 'string' && /^guardiens-(message|application)-[a-f0-9-]{36}$/.test(payload.tag)
    ? payload.tag : 'guardiens-activity';
  event.waitUntil(self.registration.showNotification('Guardiens', {
    body,
    icon: '/icons/icon-192.png',
    tag,
    renotify: false,
    data: { url: application ? '/notifications' : '/messages' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.url === '/notifications' ? '/notifications' : '/messages';
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      try {
        const navigated = await client.navigate(target);
        if (navigated) { await navigated.focus(); return; }
      } catch { /* A closed tab must not prevent opening the activity. */ }
    }
    await self.clients.openWindow(target);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'GUARDIENS_CLEAR_PUSH') return;
  event.waitUntil(self.registration.getNotifications().then((items) => {
    for (const item of items) item.close();
  }));
});
