import { describe, it, expect } from 'vitest';
import {
  capitalizeFirstName,
  normalizeEmailFirstNames,
} from '../../supabase/functions/_shared/email-first-name.ts';

describe('capitalizeFirstName', () => {
  it('met la première lettre en majuscule', () => {
    expect(capitalizeFirstName('jeremie')).toBe('Jeremie');
  });
  it('gère le trait d\'union et l\'apostrophe', () => {
    expect(capitalizeFirstName('jean-claude')).toBe('Jean-Claude');
    expect(capitalizeFirstName("m'hamed")).toBe("M'Hamed");
  });
  it('respecte un prénom déjà correct et un accent', () => {
    expect(capitalizeFirstName('Élodie')).toBe('Élodie');
    expect(capitalizeFirstName('élodie')).toBe('Élodie');
  });
  it('laisse une saisie tout en capitales', () => {
    expect(capitalizeFirstName('MARIE')).toBe('MARIE');
  });
  it('laisse passer les valeurs non textuelles', () => {
    expect(capitalizeFirstName(undefined)).toBe(undefined);
    expect(capitalizeFirstName(42)).toBe(42);
  });
});

describe('normalizeEmailFirstNames', () => {
  it('traite toutes les clés de prénom, et elles seules', () => {
    const out = normalizeEmailFirstNames({
      firstName: 'jeremie',
      sitterFirstName: 'camille',
      first_name: 'jeremie',
      sitter_first_name: 'lea',
      city: 'lyon',
    });
    expect(out).toEqual({
      firstName: 'Jeremie',
      sitterFirstName: 'Camille',
      first_name: 'Jeremie',
      sitter_first_name: 'Lea',
      city: 'lyon',
    });
  });

  it('retire le nom de famille avant de capitaliser', () => {
    expect(normalizeEmailFirstNames({ firstName: 'jeremie MARTINOT' }).firstName).toBe('Jeremie');
  });
});
