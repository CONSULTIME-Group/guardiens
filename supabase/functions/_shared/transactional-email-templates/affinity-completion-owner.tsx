import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  firstName?: string
}

const AffinityCompletionOwnerEmail = ({ firstName }: Props) => {
  const name = firstName?.trim() || ''
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Activez le score d'affinité sur vos candidatures reçues</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Sur Guardiens, un «&nbsp;score d'affinité&nbsp;» peut s'afficher à côté de
            chaque candidature reçue. Il vous aide à repérer, en un coup d'œil, les personnes
            dont le profil correspond vraiment à votre maison et à votre rythme.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>Ce que débloque votre score</Text>
            <Text style={highlightText}>
              Vos candidatures reçues affichent un score clair et vous pouvez les trier
              par affinité. Vos annonces remontent aussi auprès des gardiens dont
              l'expérience est la plus alignée avec vos attentes.
            </Text>
          </Section>

          <Text style={text}>
            Une information manque aujourd'hui pour activer le calcul&nbsp;: votre
            <strong> présence attendue </strong>pendant la garde (télétravail, absent en journée,
            visites régulières, etc.).
          </Text>

          <Text style={text}>
            Une minute suffit depuis la section «&nbsp;Règles &amp; attentes&nbsp;» de votre profil.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/owner-profile?section=rules`}>
              Activer le score d'affinité
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={subtext}>
            Une question, un blocage&nbsp;? Répondez à cet email, une personne vous lit.
          </Text>

          <LegalFooter purpose="la bonne marche de votre compte" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AffinityCompletionOwnerEmail,
  subject: "Activez le score d'affinité sur vos candidatures",
  displayName: 'Complétion affinité (propriétaire)',
  previewData: { firstName: 'Julie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const subtext = { fontSize: '13px', color: 'hsl(37, 7%, 55%)', lineHeight: '1.5', margin: '12px 0 0', fontStyle: 'italic' as const }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '24px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 8px' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const highlightBox = {
  backgroundColor: 'hsl(37, 35%, 96%)',
  border: '1px solid hsl(37, 22%, 85%)',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '20px 0',
}
const highlightTitle = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 6px' }
const highlightText = { fontSize: '13px', color: 'hsl(37, 7%, 38%)', lineHeight: '1.55', margin: '0' }
