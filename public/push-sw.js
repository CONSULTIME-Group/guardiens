/* Push only: no fetch handler and no cache of pages or private data. */
var UUID = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
var NEARBY_BODY = 'Une nouvelle annonce de garde près de chez vous.';
var TEST_BODY = 'Notification de test Guardiens : cet appareil peut recevoir vos alertes.';
var TEST_URL = '/settings?section=notifications';

/* Fixed texts only. A route is accepted only from a closed list. */
function describe(payload) {
  var kind = payload && payload.kind;
  if (kind === 'nearby_sit' && typeof payload.url === 'string' && new RegExp('^/sits/' + UUID + '$').test(payload.url)) {
    var tag = new RegExp('^guardiens-nearby-' + UUID + '$').test(payload.tag) ? payload.tag : 'guardiens-nearby';
    return { body: NEARBY_BODY, url: payload.url, tag: tag };
  }
  if (kind === 'test') {
    var testTag = new RegExp('^guardiens-test-' + UUID + '$').test(payload.tag) ? payload.tag : 'guardiens-test';
    return { body: TEST_BODY, url: TEST_URL, tag: testTag };
  }
  var application = payload && payload.body === 'Vous avez reçu une nouvelle candidature.';
  var legacyTag = typeof (payload && payload.tag) === 'string' && new RegExp('^guardiens-(message|application)-[a-f0-9-]{36}$').test(payload.tag)
    ? payload.tag : 'guardiens-activity';
  return {
    body: application ? 'Vous avez reçu une nouvelle candidature.' : 'Vous avez un nouveau message.',
    url: application ? '/notifications' : '/messages',
    tag: legacyTag,
  };
}

function safePath(url) {
  if (url === '/notifications' || url === TEST_URL) return url;
  if (typeof url === 'string' && new RegExp('^/sits/' + UUID + '$').test(url)) return url;
  return '/messages';
}

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Generic notice below. */ }
  const d = describe(payload || {});
  event.waitUntil(self.registration.showNotification('Guardiens', {
    body: d.body,
    icon: '/icons/icon-192.png',
    tag: d.tag,
    renotify: false,
    data: { url: d.url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = safePath(event.notification.data?.url);
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
