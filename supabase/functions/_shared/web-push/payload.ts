// Contenu de notification strictement constant : aucun nom, aucun extrait,
// aucune adresse, aucun identifiant de membre.

export type PushEventKind = 'message' | 'application';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const BODIES: Record<PushEventKind, string> = {
  message: 'Vous avez un nouveau message.',
  application: 'Vous avez reçu une nouvelle candidature.',
};

const URLS: Record<PushEventKind, string> = {
  message: '/messages',
  application: '/notifications',
};

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
