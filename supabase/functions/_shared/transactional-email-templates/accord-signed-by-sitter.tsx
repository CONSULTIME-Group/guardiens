import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = "https://guardiens.fr"

interface Props { sitTitle?: string; sitId?: string; sitterFirstName?: string }

const AccordSignedBySitterEmail = ({ sitTitle, sitId, sitterFirstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre gardien a signé l'accord de garde</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>L'accord de garde est signé</Heading>
        <Text style={text}>
          {sitterFirstName || 'Votre gardien'} vient de signer l'accord de garde
          {sitTitle ? ` pour « ${sitTitle} »` : ''}.
        </Text>
        <Text style={text}>
          Les deux signatures sont réunies : dates, rôles et limites sont maintenant
          écrits et acceptés par chacun. Vous pouvez retrouver l'accord à tout moment
          depuis la page de votre garde.
        </Text>
        <Button style={button} href={sitId ? `${SITE_URL}/sits/${sitId}` : `${SITE_URL}/dashboard`}>
          Voir ma garde
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
  component: AccordSignedBySitterEmail,
  subject: "L'accord de garde est signé des deux côtés",
  displayName: 'Accord de garde signé (propriétaire)',
  previewData: { sitTitle: 'Garde chat à Reims', sitId: '00000000-0000-0000-0000-000000000000', sitterFirstName: 'Marion' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
