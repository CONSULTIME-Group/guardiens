import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = "https://guardiens.fr"

interface Props {
  sitTitle?: string
  ownerFirstName?: string
  sitId?: string
}

const ApplicationReopenedEmail = ({ sitTitle, ownerFirstName, sitId }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre candidature a été rouverte, vous pouvez répondre.</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Candidature rouverte</Heading>
        <Text style={text}>
          {ownerFirstName || 'Le propriétaire'} a rouvert votre candidature pour «{' '}
          {sitTitle || 'une garde'} ».
        </Text>
        <Text style={text}>
          Vous pouvez reprendre la discussion et postuler à nouveau si l'annonce
          vous intéresse toujours.
        </Text>
        <Button style={button} href={`${SITE_URL}/mes-candidatures`}>
          Voir mes candidatures
        </Button>
        {sitId ? (
          <Text style={textSmall}>
            <a href={`${SITE_URL}/sits/${sitId}`} style={link}>Revoir l'annonce</a>
          </Text>
        ) : null}
        <LegalFooter
          purpose="le suivi de votre candidature"
          basis="6.1.b"
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ApplicationReopenedEmail,
  subject: 'Votre candidature a été rouverte',
  displayName: 'Candidature rouverte',
  previewData: { sitTitle: 'Garde chat Paris 11e', ownerFirstName: 'Julie', sitId: '00000000-0000-0000-0000-000000000000' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const textSmall = { fontSize: '13px', color: 'hsl(37, 7%, 50%)', margin: '16px 0 0' }
const link = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
