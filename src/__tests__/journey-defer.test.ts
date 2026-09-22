import { describe, it, expect } from 'vitest';
import { deferDecision } from '../../supabase/functions/_shared/journey-defer.ts';
import { journeyIsOwner } from '../../supabase/functions/_shared/journey-audience.ts';
import { onboardingJ1Subject } from '../../supabase/functions/_shared/onboarding-j1-subject.ts';

const NOW = Date.UTC(2026, 8, 22, 10, 0, 0);
const dueDaysAgo = (d: number) => NOW - d * 86400_000;

describe('deferDecision', () => {
  it('reporte une étape en retard de 20 jours', () => {
    const d = deferDecision('no_open_sit', dueDaysAgo(20), NOW);
    expect(d.expired).toBe(false);
    expect(d.logReason).toBe('skipped_no_open_sit');
    expect(d.exitReason).toBeNull();
  });

  it('sort le parcours au delà de 21 jours', () => {
    const d = deferDecision('no_open_sit', dueDaysAgo(22), NOW);
    expect(d.expired).toBe(true);
    expect(d.exitReason).toBe('no_open_sit_expired');
  });

  it('les motifs hérités restent acceptés avec la même borne', () => {
    expect(deferDecision('no_coordinates', dueDaysAgo(20), NOW).expired).toBe(false);
    expect(deferDecision('no_open_sit_nearby', dueDaysAgo(22), NOW).exitReason).toBe(
      'no_open_sit_nearby_expired',
    );
  });
});

describe('journeyIsOwner', () => {
  it('la séquence gardien ne passe jamais isOwner à vrai', () => {
    expect(journeyIsOwner('sitter', 'both')).toBe(false);
    expect(journeyIsOwner('sitter', 'owner')).toBe(false);
  });
  it('la séquence propriétaire passe isOwner à vrai', () => {
    expect(journeyIsOwner('owner', 'sitter')).toBe(true);
  });
  it('une séquence tous publics suit le rôle du membre', () => {
    expect(journeyIsOwner('all', 'owner')).toBe(true);
    expect(journeyIsOwner('all', 'sitter')).toBe(false);
  });
});

describe('onboardingJ1Subject', () => {
  it('objet propriétaire', () => {
    expect(onboardingJ1Subject({ isOwner: true })).toBe('Votre première annonce en 2 minutes, Guardiens');
  });
  it('objet gardien', () => {
    expect(onboardingJ1Subject({ isOwner: false })).toBe(
      'Bienvenue sur Guardiens, votre profil de gardien en quelques minutes',
    );
    expect(onboardingJ1Subject({})).toBe(
      'Bienvenue sur Guardiens, votre profil de gardien en quelques minutes',
    );
  });
});
