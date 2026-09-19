// Validation des cles d'abonnement push (base64url). Helper pur.

export type KeysCheck =
  | { ok: true }
  | { ok: false; reason: string };

export function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+=*$/.test(value)) return null;
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function validateSubscriptionKeys(keys: unknown): KeysCheck {
  if (!keys || typeof keys !== 'object') return { ok: false, reason: 'keys_missing' };
  const { auth, p256dh } = keys as Record<string, unknown>;

  if (typeof auth !== 'string' || typeof p256dh !== 'string') {
    return { ok: false, reason: 'keys_missing' };
  }
  if (auth.length > 64 || p256dh.length > 160) {
    return { ok: false, reason: 'keys_too_long' };
  }

  const authBytes = decodeBase64Url(auth);
  if (!authBytes) return { ok: false, reason: 'auth_not_base64url' };
  if (authBytes.length !== 16) return { ok: false, reason: 'auth_bad_length' };

  const pubBytes = decodeBase64Url(p256dh);
  if (!pubBytes) return { ok: false, reason: 'p256dh_not_base64url' };
  if (pubBytes.length !== 65) return { ok: false, reason: 'p256dh_bad_length' };
  if (pubBytes[0] !== 0x04) return { ok: false, reason: 'p256dh_bad_prefix' };

  return { ok: true };
}
