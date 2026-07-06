/// <reference types="npm:@types/react@18.3.1" />
//
// `<AlmaSignoff />` — bloc de clôture standardisé pour les emails signés Alma.
// Rappelle que l'utilisateur garde la main sur ses décisions, et affiche la
// baseline de rassurance pricing. À placer juste au-dessus de <LegalFooter />.
//
// Vouvoiement absolu (mem://style/editorial-tone-mapping).
// Aucun tiret cadratin, aucun emoji.

import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'

const wrap = { margin: '18px 0 12px' }
const reliure = {
  fontSize: '13px',
  color: 'hsl(37, 7%, 33%)',
  lineHeight: '1.6',
  margin: '0 0 6px',
  fontStyle: 'italic' as const,
}
const pricing = {
  fontSize: '12px',
  color: 'hsl(153, 42%, 30%)',
  fontWeight: 600 as const,
  margin: '0 0 8px',
}

export const AlmaSignoff = () => (
  <Section style={wrap}>
    <Text style={reliure}>
      Vous relisez, vous décidez. C'est vous qui gardez la main.
    </Text>
    <Text style={pricing}>Gratuit pour vous, sans engagement.</Text>
  </Section>
)

export default AlmaSignoff
