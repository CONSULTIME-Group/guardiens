import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = "https://guardiens.fr"

interface Props { sitTitle?: string; sitId?: string; ownerFirstName?: string }

const AccordReadyForSitterEmail = ({ sitTitle, sitId, ownerFirstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Le propriétaire a signé, à votre tour</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Votre accord de garde vous attend</Heading>
        <Text style={text}>
          {ownerFirstName || 'Le propriétaire'} vient de signer l'accord de garde
          {sitTitle ? ` pour « ${sitTitle} »` : ''}.
        </Text>
        <Text style={text}>
          Vous pouvez à votre tour le lire et le signer depuis la page de la garde.
          Une fois les deux signatures réunies, tout sera en règle pour votre venue.
        </Text>
        <Button style={button} href={sitId ? `${SITE_URL}/sits/${sitId}` : `${SITE_URL}/dashboard`}>
          Lire et signer l'accord
        </Button>
        <LegalFooter
          purpose="la gestion de votre accord de garde"
          basis="6.1.b"
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccordReadyForSitterEmail,
  subject: 'Votre accord de garde est prêt à signer',
  displayName: 'Accord de garde à signer (gardien)',
  previewData: { sitTitle: 'Garde chat à Reims', sitId: '00000000-0000-0000-0000-000000000000', ownerFirstName: 'Julie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
