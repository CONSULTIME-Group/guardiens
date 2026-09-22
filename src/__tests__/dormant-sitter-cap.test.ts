import { describe, it, expect } from 'vitest';
import {
  DORMANT_MAX_SENDS_PER_RUN,
  DORMANT_START_AT_MS,
  dormantRunBatch,
  dormantSendDecision,
  dormantWindowOpen,
} from '../../supabase/functions/_shared/dormant-sitter-cap.ts';

// Après la date de démarrage du lissage.
const AFTER = Date.UTC(2026, 9, 6, 11, 0, 0);
const BEFORE = Date.UTC(2026, 9, 2, 11, 0, 0);

const base = { alreadySentCount: 0, isAdmin: false, nowMs: AFTER };

describe('dormantSendDecision', () => {
  it('envoie à partir de 30 jours d\'ancienneté', () => {
    expect(dormantSendDecision({ ...base, daysSinceSignup: 30 }).send).toBe(true);
    const tooRecent = dormantSendDecision({ ...base, daysSinceSignup: 29 });
    expect(tooRecent.send).toBe(false);
    expect(tooRecent.reason).toBe('too_recent_signup');
  });

  it('respecte un espacement de 14 jours entre deux envois', () => {
    expect(
      dormantSendDecision({ ...base, daysSinceSignup: 120, alreadySentCount: 1, daysSinceLastSend: 13 }).reason,
    ).toBe('too_soon_since_last_send');
    expect(
      dormantSendDecision({ ...base, daysSinceSignup: 120, alreadySentCount: 1, daysSinceLastSend: 14 }).send,
    ).toBe(true);
  });

  it('plafonne à trois envois', () => {
    expect(dormantSendDecision({ ...base, daysSinceSignup: 200, alreadySentCount: 2 }).send).toBe(true);
    const capped = dormantSendDecision({ ...base, daysSinceSignup: 200, alreadySentCount: 3 });
    expect(capped.send).toBe(false);
    expect(capped.reason).toBe('cap_reached');
  });

  it('exclut les comptes administrateurs', () => {
    const d = dormantSendDecision({ ...base, daysSinceSignup: 60, isAdmin: true });
    expect(d.send).toBe(false);
    expect(d.reason).toBe('admin_account');
  });

  it('aucun envoi avant le lundi 5 octobre 2026', () => {
    expect(dormantWindowOpen(BEFORE)).toBe(false);
    expect(dormantWindowOpen(DORMANT_START_AT_MS)).toBe(true);
    const d = dormantSendDecision({ ...base, daysSinceSignup: 200, nowMs: BEFORE });
    expect(d.send).toBe(false);
    expect(d.reason).toBe('before_start_date');
  });
});

describe('dormantRunBatch', () => {
  it('150 envois par passage, le reste attend', () => {
    const rows = Array.from({ length: 400 }, (_, i) => ({
      id: i,
      nearestSitKm: 400 - i,
      lastSeenAt: '2026-09-20T00:00:00.000Z',
    }));
    const { batch, deferred } = dormantRunBatch(rows);
    expect(DORMANT_MAX_SENDS_PER_RUN).toBe(150);
    expect(batch).toHaveLength(150);
    expect(deferred).toHaveLength(250);
    expect(batch[0].nearestSitKm).toBe(1);
    expect(batch[149].nearestSitKm).toBe(150);
  });

  it('à distance égale, le gardien vu le plus récemment passe devant', () => {
    const rows = [
      { id: 'ancien', nearestSitKm: 20, lastSeenAt: '2026-08-01T00:00:00.000Z' },
      { id: 'recent', nearestSitKm: 20, lastSeenAt: '2026-09-20T00:00:00.000Z' },
      { id: 'loin', nearestSitKm: 90, lastSeenAt: '2026-09-21T00:00:00.000Z' },
      { id: 'inconnu', nearestSitKm: null, lastSeenAt: null },
    ];
    const { batch } = dormantRunBatch(rows, 4);
    expect(batch.map((r) => r.id)).toEqual(['recent', 'ancien', 'loin', 'inconnu']);
  });
});
