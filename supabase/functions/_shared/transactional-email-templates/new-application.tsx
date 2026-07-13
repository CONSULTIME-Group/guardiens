import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props {
  sitterFirstName?: string
  sitTitle?: string
}

const NewApplicationEmail = ({ sitterFirstName, sitTitle }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{sitterFirstName || 'Un gardien'} a postulé pour votre garde</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Nouvelle candidature</Heading>
        <Text style={text}>
          <strong>{sitterFirstName || 'Un gardien'}</strong> a postulé pour votre garde
          {sitTitle ? ` "${sitTitle}"` : ''}.
        </Text>
        <Text style={text}>
          Consultez sa candidature et son profil pour décider si c'est le bon match !
        </Text>
        <Button style={button} href={`${SITE_URL}/dashboard`}>
          Voir la candidature
        </Button>
        <LegalFooter
          purpose="la gestion de votre annonce"
          basis="6.1.b"
        />
      </Container>
      </Body>
      </Html>
)

export const template = {
  component: NewApplicationEmail,
  subject: (data: Record<string, any>) =>
    `${data.sitterFirstName || 'Un gardien'} a postulé pour votre garde — Guardiens`,
  displayName: 'Nouvelle candidature reçue',
  previewData: { sitterFirstName: 'Marie', sitTitle: 'Garde chat Paris 11e' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
