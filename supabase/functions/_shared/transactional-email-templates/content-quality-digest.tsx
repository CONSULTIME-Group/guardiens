import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

export interface ContentDefectItem {
  cible: string
  regle: string
  table?: string
}

interface Props {
  alertesOuvertes?: number
  horsGel?: number
  selftest?: string
  detecteurCasse?: boolean
  derive?: boolean
  cibles?: ContentDefectItem[]
}

const Email = ({
  alertesOuvertes = 0,
  horsGel = 0,
  selftest = 'inconnu',
  detecteurCasse = false,
  derive = false,
  cibles = [],
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Qualité de contenu : {horsGel} défaut(s) hors périmètre gelé</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Contrôle qualité de contenu</Heading>

        <Text style={text}>Alertes ouvertes : {alertesOuvertes}.</Text>
        <Text style={text}>Hors périmètre gelé : {horsGel}.</Text>
        <Text style={text}>Selftest du détecteur : {selftest}.</Text>
        {detecteurCasse ? (
          <Text style={alert}>Le détecteur ne détecte plus ce qu'il devrait (cas de test en échec).</Text>
        ) : null}
        {derive ? (
          <Text style={text}>Le volume total d'alertes dépasse le seuil configuré.</Text>
        ) : null}

        {cibles.length > 0 ? (
          <Section>
            <Hr style={hr} />
            <Text style={itemTitle}>Cibles concernées</Text>
            {cibles.map((c, i) => (
              <Text key={i} style={itemDetail}>
                {c.cible} : {c.regle}{c.table ? ` (${c.table})` : ''}
              </Text>
            ))}
          </Section>
        ) : null}

        <LegalFooter />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Contrôle qualité de contenu, signaux ouverts',
  displayName: 'Admin, qualité de contenu',
  to: 'contact@guardiens.fr',
  previewData: {
    alertesOuvertes: 21,
    horsGel: 3,
    selftest: '64 cas, 0 en échec',
    detecteurCasse: false,
    derive: true,
    cibles: [
      { cible: 'garde-animaux-lyon-7', regle: 'chiffre_non_source', table: 'seo_city_pages' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '20px', fontWeight: 600, color: '#1f2937', margin: '16px 0' }
const text = { fontSize: '14px', lineHeight: '20px', color: '#374151', margin: '4px 0' }
const alert = { fontSize: '14px', lineHeight: '20px', color: '#991b1b', fontWeight: 600 }
const itemTitle = { fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 6px' }
const itemDetail = { fontSize: '13px', color: '#374151', margin: '2px 0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
