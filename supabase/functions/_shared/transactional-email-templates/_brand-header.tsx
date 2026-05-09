/// <reference types="npm:@types/react@18.3.1" />
//
// `<BrandHeader />` — wordmark partagé pour TOUS les templates transactionnels.
//
// Identique au wordmark utilisé dans les emails d'auth (`_shared/email-templates/signup.tsx`),
// mais dupliqué ici pour respecter l'isolation entre les deux dossiers
// `_shared/email-templates/` (auth) et `_shared/transactional-email-templates/`
// (transactionnel) — un import croisé pourrait casser le bundling Deno
// d'une fonction qui ne charge qu'un seul des deux dossiers.
//
// Règle : tout template transactionnel DOIT commencer par <BrandHeader />
// juste après l'ouverture de <Container>. Garde-fou : voir
// `brand-header-presence_test.ts`.

import * as React from 'npm:react@18.3.1'
import { Heading } from 'npm:@react-email/components@0.0.22'

const wordmark = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  fontFamily: "'Playfair Display', Georgia, serif",
  color: '#1a1a1a',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

export const BrandHeader = () => (
  <Heading style={wordmark}>
    <span style={{ color: '#3d7a5f' }}>g</span>uardiens
  </Heading>
)

export default BrandHeader
