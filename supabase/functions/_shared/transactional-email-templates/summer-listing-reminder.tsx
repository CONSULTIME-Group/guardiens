import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props { firstName?: string }

const Email = ({ firstName }: Props) => {
  const name = firstName || ''
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>L'arrosage, les animaux, la surveillance : tout est gratuit sur Guardiens.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>
          <Text style={text}>
            L'été approche, et avec lui les vacances. Si vous prévoyez de partir,
            pensez à confier votre maison, vos plantes ou vos animaux à une personne de confiance.
          </Text>
          <Text style={text}>
            Sur {SITE_NAME}, publier votre besoin est simple et entièrement gratuit.
            Que ce soit pour arroser les plantes, veiller sur les animaux
            ou simplement garder la maison pendant votre absence,
            il y a sûrement un gardien près de chez vous.
          </Text>
          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/sits/create`}>
              Publier mon besoin
            </Button>
          </Section>
          <Text style={text}>
            Vos plantes et vos animaux vous remercieront. En attendant, bonnes préparations de voyage.
          </Text>
          <Hr style={hr} />
          <LegalFooter purpose="d'accompagnement à la prise en main de votre compte" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Cet été, ne laissez pas votre maison seule',
  displayName: 'Rappel été propriétaire, publication annonce',
  previewData: { firstName: 'Marie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
