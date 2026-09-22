import { describe, it, expect } from 'vitest';
import { dormantSendDecision } from '../../supabase/functions/_shared/dormant-sitter-cap.ts';

describe('dormantSendDecision', () => {
  it('envoie aux trois jalons', () => {
    for (const day of [30, 45, 75]) {
      expect(dormantSendDecision({ daysSinceSignup: day, alreadySentCount: 0, isAdmin: false }).send).toBe(true);
    }
  });

  it('tolère la semaine suivant un jalon, pas au delà', () => {
    expect(dormantSendDecision({ daysSinceSignup: 36, alreadySentCount: 0, isAdmin: false }).send).toBe(true);
    expect(dormantSendDecision({ daysSinceSignup: 38, alreadySentCount: 0, isAdmin: false }).send).toBe(false);
  });

  it('plafonne à trois envois', () => {
    expect(dormantSendDecision({ daysSinceSignup: 75, alreadySentCount: 2, isAdmin: false }).send).toBe(true);
    const capped = dormantSendDecision({ daysSinceSignup: 75, alreadySentCount: 3, isAdmin: false });
    expect(capped.send).toBe(false);
    expect(capped.reason).toBe('cap_reached');
    expect(dormantSendDecision({ daysSinceSignup: 75, alreadySentCount: 9, isAdmin: false }).send).toBe(false);
  });

  it('exclut les comptes administrateurs', () => {
    const d = dormantSendDecision({ daysSinceSignup: 30, alreadySentCount: 0, isAdmin: true });
    expect(d.send).toBe(false);
    expect(d.reason).toBe('admin_account');
  });
});
