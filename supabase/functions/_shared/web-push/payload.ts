// Contenu de notification strictement constant : aucun nom, aucun extrait,
// aucune adresse, aucun identifiant de membre.

export type PushEventKind = 'message' | 'application';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  kind?: 'message' | 'application' | 'nearby_sit' | 'test';
}

const BODIES: Record<PushEventKind, string> = {
  message: 'Vous avez un nouveau message.',
  application: 'Vous avez reçu une nouvelle candidature.',
};

const URLS: Record<PushEventKind, string> = {
  message: '/messages',
  application: '/notifications',
};

export const NEARBY_SIT_BODY = 'Une nouvelle annonce de garde près de chez vous.';
export const TEST_BODY = 'Notification de test Guardiens : cet appareil peut recevoir vos alertes.';
export const TEST_URL = '/settings?section=notifications';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPushEventKind(value: unknown): value is PushEventKind {
  return value === 'message' || value === 'application';
}

export function buildPushPayload(kind: PushEventKind, jobId: string): PushPayload {
  return {
    title: 'Guardiens',
    body: BODIES[kind],
    url: URLS[kind],
    // Le tag derive du seul identifiant de job, donnee technique non personnelle.
    tag: `guardiens-${kind}-${jobId}`,
  };
}

/** Texte générique sur l'écran verrouillé : ni ville, ni titre, ni date. */
export function buildNearbySitPayload(jobId: string, sitId: string): PushPayload | null {
  if (!UUID_RE.test(jobId) || !UUID_RE.test(sitId)) return null;
  return {
    title: 'Guardiens',
    body: NEARBY_SIT_BODY,
    url: `/sits/${sitId.toLowerCase()}`,
    tag: `guardiens-nearby-${sitId.toLowerCase()}`,
    kind: 'nearby_sit',
  };
}

export function buildTestPayload(requestId: string): PushPayload {
  return { title: 'Guardiens', body: TEST_BODY, url: TEST_URL, tag: `guardiens-test-${requestId}`, kind: 'test' };
}
