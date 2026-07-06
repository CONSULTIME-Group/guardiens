/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr } from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature, AlmaIntro } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  firstName?: string
  missionTitle?: string
  missionId?: string
  ageDays?: number
}

const Email = ({ firstName, missionTitle = 'Votre mission', missionId, ageDays }: Props) => {
  const publishUrl = `${SITE_URL}/petites-missions/creer?utm_source=email&utm_campaign=mission_auto_closed`
  const detailUrl = missionId ? `${SITE_URL}/petites-missions/${missionId}` : `${SITE_URL}/petites-missions`
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre mission a été clôturée automatiquement, vous pouvez la relancer</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <AlmaIntro firstName={firstName} />
          <Heading style={h1}>Votre mission a été clôturée</Heading>
          <Text style={p}>
            La mission « {missionTitle} » a été clôturée automatiquement{ageDays ? ` après ${ageDays} jours sans activité` : ''}.
            C'est un simple nettoyage pour garder le fil de l'entraide clair.
          </Text>
          <Text style={p}>
            Vous pouvez la republier en quelques clics si le besoin est toujours d'actualité,
            ou en publier une nouvelle plus courte, plus précise.
          </Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={publishUrl} style={btn}>Publier une nouvelle mission</Button>
          </Section>
          <Text style={pSmall}>
            Vous pouvez aussi revoir l'ancienne mission ici : <a href={detailUrl} style={link}>voir la mission clôturée</a>.
          </Text>
          <Hr style={hr} />
          <AlmaSignoff />
          <LegalFooter />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `Votre mission « ${data?.missionTitle ?? 'mission'} » a été clôturée`,
  displayName: 'Mission clôturée automatiquement',
  previewData: { firstName: 'Marie', missionTitle: 'Sortir mon chien mardi soir', missionId: 'demo', ageDays: 45 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { color: '#1a1a1a', fontSize: '22px', fontWeight: 700, margin: '20px 0 12px 0' }
const p = { color: '#333', fontSize: '15px', lineHeight: '24px', margin: '0 0 14px 0' }
const pSmall = { color: '#666', fontSize: '13px', lineHeight: '20px', margin: '0 0 8px 0' }
const link = { color: '#2b6cb0', textDecoration: 'underline' }
const btn = { backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }
const hr = { borderColor: '#eee', margin: '20px 0' }
