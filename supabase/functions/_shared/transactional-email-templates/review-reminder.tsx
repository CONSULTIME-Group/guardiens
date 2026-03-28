import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.lovable.app"

interface Props { sitTitle?: string }

const ReviewReminderEmail = ({ sitTitle }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Avez-vous pensé à laisser un avis ?</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Comment s'est passée la garde ? ⭐</Heading>
        <Text style={text}>
          Votre garde{sitTitle ? ` "${sitTitle}"` : ''} est terminée ! Prenez un instant pour laisser un avis.
        </Text>
        <Text style={text}>
          Votre retour aide la communauté à identifier les meilleurs gardiens et propriétaires.
        </Text>
        <Button style={button} href={`${SITE_URL}/dashboard`}>
          Laisser un avis
        </Button>
        <Hr style={hr} />
        <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReviewReminderEmail,
  subject: 'Avez-vous pensé à laisser un avis ?',
  displayName: 'Relance avis (J+5)',
  previewData: { sitTitle: 'Garde chat Paris 11e' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '30px 0 0' }
