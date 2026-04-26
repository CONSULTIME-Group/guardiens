/// <reference types="npm:@types/react@18.3.1" />
//
// Footer légal partagé pour les emails AUTH (signup, recovery, magic-link,
// invite, email-change, reauthentication).
//
// Pourquoi un fichier dédié ?
//   - Conformité RGPD (art. 13) : chaque email doit rappeler l'identité du
//     responsable de traitement, la base légale et les droits de la personne
//     concernée. Un helper unique évite la dérive entre templates et garantit
//     une mise à jour centralisée si le SIRET / contact change.
//   - DRY : 6 templates auth + cohérence visuelle avec les 24 templates
//     transactionnels qui ont déjà ce bloc.
//
// Base légale : article 6.1.b RGPD (exécution de mesures précontractuelles
// ou contractuelles à la demande de la personne concernée). Les emails auth
// sont strictement nécessaires à la création / sécurisation d'un compte —
// ils ne nécessitent donc PAS de mécanisme d'opt-out (le système
// d'unsubscribe est volontairement absent ici, contrairement aux
// transactionnels).

import * as React from 'npm:react@18.3.1'
import { Hr, Section, Text } from 'npm:@react-email/components@0.0.22'

const SITE_NAME = 'Guardiens'

export const LegalFooter = () => (
  <Section>
    <Hr style={hr} />
    <Text style={legal}>
      Cet e-mail vous est envoyé par <strong>{SITE_NAME}</strong> (Jérémie Martinot,
      auto-entrepreneur, SIRET 894 864 040 00015) dans le cadre de la création
      ou de la sécurisation de votre compte (art. 6.1.b RGPD — exécution de
      mesures précontractuelles ou contractuelles).
    </Text>
    <Text style={legal}>
      Cet email d'authentification ne contient aucun contenu marketing.
      Vous disposez d'un droit d'accès, de rectification, d'effacement et
      d'opposition sur vos données personnelles. Pour exercer ces droits :{' '}
      <a href="mailto:contact@guardiens.fr" style={link}>contact@guardiens.fr</a>.
    </Text>
    <Text style={signature}>L'équipe {SITE_NAME} 🐾</Text>
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
