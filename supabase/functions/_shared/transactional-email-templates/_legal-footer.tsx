/// <reference types="npm:@types/react@18.3.1" />
//
// `<LegalFooter />` — footer légal RGPD partagé pour TOUS les templates
// transactionnels. Mirroir du helper auth (`_shared/email-templates/_legal-footer.tsx`),
// dupliqué ici pour respecter l'isolation entre les deux dossiers (cf.
// `_branded-head.tsx` / `_brand-header.tsx`).
//
// Pourquoi un fichier dédié ?
//   - Conformité RGPD (art. 13) : chaque email rappelle l'identité du
//     responsable de traitement, la base légale, et les droits de la
//     personne concernée. Un helper unique évite la dérive entre les 28
//     templates et garantit une mise à jour centralisée si le SIRET ou le
//     contact change.
//   - Cohérence visuelle et juridique avec les emails d'auth.
//
// Garde-fou : voir `legal-footer-presence_test.ts` (chaque template doit
// importer ET utiliser `<LegalFooter />`).

import * as React from 'npm:react@18.3.1'
import { Hr, Section, Text } from 'npm:@react-email/components@0.0.22'

const SITE_NAME = 'Guardiens'

const BASIS_LABEL: Record<'6.1.b' | '6.1.f', string> = {
  '6.1.b': 'exécution de mesures précontractuelles ou contractuelles',
  '6.1.f': 'intérêt légitime',
}

export interface LegalFooterProps {
  /**
   * Phrase de finalité injectée après « dans le cadre de … » — ex :
   * « du traitement de votre candidature », « de la gestion de votre
   * abonnement », « du bon fonctionnement de votre compte ».
   */
  purpose: string
  /** Base légale RGPD applicable. Défaut : 6.1.b (exécution contractuelle). */
  basis?: '6.1.b' | '6.1.f'
  /** Mention complémentaire optionnelle (ex. avis : L. 111-7-2 du Code de la consommation). */
  extra?: React.ReactNode
}

export const LegalFooter = ({ purpose, basis = '6.1.b', extra }: LegalFooterProps) => (
  <Section>
    <Hr style={hr} />
    <Text style={legal}>
      Email envoyé par <strong>{SITE_NAME}</strong>, SIRET 894 864 040 00015,
      dans le cadre de {purpose} (art. {basis} RGPD,{' '}
      {BASIS_LABEL[basis]}).
    </Text>
    {extra ? <Text style={legal}>{extra}</Text> : null}
    <Text style={legal}>
      Vous disposez d'un droit d'accès, de rectification, d'effacement, de
      limitation, de portabilité et d'opposition sur vos données. Pour
      exercer ces droits ou pour toute question :{' '}
      <a href="mailto:contact@guardiens.fr" style={link}>contact@guardiens.fr</a>.
    </Text>
    <Text style={signature}>L'équipe {SITE_NAME}</Text>
  </Section>
)

export default LegalFooter

const hr = { borderColor: '#eaeaea', margin: '32px 0 16px' }
const legal = {
  fontSize: '10px',
  color: '#999999',
  lineHeight: '1.5',
  margin: '0 0 10px',
}
const link = { color: '#3d7a5f', textDecoration: 'underline' }
const signature = {
  fontSize: '12px',
  color: '#999999',
  margin: '14px 0 0',
}
