import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'

/** Encadré preuve « 3 sur 4 », partagé par la question de départ et Noël 2026. */
export const ProofCard = () => (
  <Section style={proofCard}>
    <Text style={proofFigure}>3 sur 4</Text>
    <Text style={proofText}>
      des annonces publiées reçoivent des candidatures. Les premières arrivent en général sous 24 heures.
    </Text>
  </Section>
)

const serif = "'Playfair Display', Georgia, serif"
const proofCard = { backgroundColor: '#FBF6EC', border: '1px solid #E6DCCB', borderRadius: '16px', padding: '20px 22px' }
const proofFigure = { fontFamily: serif, fontSize: '34px', lineHeight: '1.1', color: '#2C6D50', fontWeight: 600, margin: '0 0 6px' }
const proofText = { fontSize: '16.5px', lineHeight: '1.65', color: '#3A352E', margin: 0 }
