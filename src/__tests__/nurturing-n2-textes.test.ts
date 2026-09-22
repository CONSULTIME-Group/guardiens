import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Verrou de vocabulaire du lot N2.
//
// Les douze gabarits réécrits doivent rester affirmatifs, accentués, sans
// tiret cadratin ni demi-cadratin, et sans les chiffres retirés.

const DIR = resolve(__dirname, '../../supabase/functions/_shared/transactional-email-templates');

const TEMPLATES = [
  'sitter-encourage-candidature',
  'dormant-sitter-nudge',
  'availability-nudge',
  'relance-profil-incomplet',
  'relance-cp-manquant',
  'owner-no-sit-j3',
  'owner-no-sit-j10',
  'owner-no-sit-j21',
  'owner-activation-nudge',
      'seasonal-nurture',
      'reactivation-d30',
  'seasonal-nurture',
  'reactivation-d30',
];

const read = (name: string) => readFileSync(resolve(DIR, `${name}.tsx`), 'utf8');

/**
 * Texte visible approximatif : contenu des balises JSX et chaînes de copie,
 * en retirant les imports, les styles et les identifiants techniques.
 */
function visibleText(src: string): string {
  return src
    .split('\n')
    .filter((line) => !/^\s*(import|const (main|container|h1|text|textSmall|card|cardTitle|cardLine|baseline|sig|hr|ctaSection|button|inlineLink|statCard|statBig|statSmall|avatar|avatarFallback|listItem|subtext|reassurance|topStripe|subTitle|cardBody|ctaWrap|ctaWrapSecondary|primaryCta|secondaryCta|signOff|signName|hiddenCard|p|pCenter|btnPrimary|muted|hero|heroKicker|wrap|link|legal|footer|highlightBox|highlightTitle|highlightText)\s*=)/.test(line))
    .filter((line) => !/displayName:/.test(line))
    .join('\n');
}

describe('lot N2, vocabulaire des gabarits réécrits', () => {
  for (const name of TEMPLATES) {
    it(`${name} reste affirmatif et sans tiret cadratin`, () => {
      const text = visibleText(read(name));
      expect(text).not.toMatch(/[\u2013\u2014]/);
      expect(text).not.toMatch(/\bne\s+\w+\s+pas\b/i);
      expect(text).not.toMatch(/\bn'\w+\s+pas\b/i);
      expect(text).not.toMatch(/\bjamais\b/i);
      expect(text).not.toMatch(/\baucun\w*\b/i);
      expect(text).not.toMatch(/\brien\b/i);
      expect(text).not.toMatch(/\bsans\b/i);
    });
  }

  it('les chiffres retirés restent absents', () => {
    for (const name of TEMPLATES) {
      const src = read(name);
      expect(src).not.toMatch(/3 candidatures/);
      expect(src).not.toMatch(/en moyenne/);
    }
  });

  it('les phrases clés sont recopiées à l\'identique', () => {
    expect(read('sitter-encourage-candidature')).toContain(
      'Une première candidature se prépare en quelques minutes',
    );
    expect(read('dormant-sitter-nudge')).toContain('Nous avons pensé à vous.');
    expect(read('availability-nudge')).toContain('Votre profil peut faire la différence.');
    expect(read('relance-profil-incomplet')).toContain(
      'Trois informations, et votre profil apparaît près de chez vous',
    );
    expect(read('relance-cp-manquant')).toContain('Indiquer mon code postal');
    expect(read('owner-no-sit-j3')).toContain('Publier mon annonce');
    expect(read('owner-no-sit-j10')).toContain(
      'Plus d\'une annonce sur deux reçoit sa première candidature en moins de 48',
    );
    expect(read('owner-no-sit-j21')).toContain('Une question de Jérémie');
    expect(read('owner-activation-nudge')).toContain(
      'Guardiens sert aussi pour un soir, un week-end, un coup de main',
    );
    expect(read('seasonal-nurture')).toContain(
      'Vous restez chez vous cette fois',
    );
    expect(read('reactivation-d30')).toContain('Envie de faire une pause');
  });

  it('le pied de page des relances est uniformisé', () => {
    const footer = 'Vous recevez ce message en tant que membre de Guardiens. Vos préférences d\'email se règlent depuis votre espace personnel.';
    for (const name of [
      'sitter-encourage-candidature',
      'dormant-sitter-nudge',
      'availability-nudge',
      'relance-profil-incomplet',
      'relance-cp-manquant',
      'owner-no-sit-j3',
      'owner-no-sit-j10',
      'owner-no-sit-j21',
      'owner-activation-nudge',
      'seasonal-nurture',
      'reactivation-d30',
    ]) {
      expect(read(name)).toContain(footer);
    }
  });

  it('les cartes gardien du J+3 se limitent aux données affichables', () => {
    const src = read('owner-no-sit-j3');
    expect(src).toContain('distance_km');
    expect(src).not.toMatch(/latitude|longitude/);
  });
});
