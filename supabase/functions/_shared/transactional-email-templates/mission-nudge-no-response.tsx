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
}

const Email = ({ firstName, missionTitle = 'Votre mission', missionId }: Props) => {
  const editUrl = missionId
    ? `${SITE_URL}/petites-missions/${missionId}?edit=1&utm_source=email&utm_campaign=mission_nudge_no_response`
    : `${SITE_URL}/petites-missions`
  const detailUrl = missionId
    ? `${SITE_URL}/petites-missions/${missionId}?utm_source=email&utm_campaign=mission_nudge_no_response`
    : `${SITE_URL}/petites-missions`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre mission n'a pas encore trouvé preneur</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <AlmaIntro firstName={firstName} />
          <Heading style={h1}>Votre mission attend toujours une réponse</Heading>
          <Text style={p}>
            Votre mission « {missionTitle} » est en ligne depuis une semaine et n'a reçu aucune proposition pour l'instant.
          </Text>
          <Text style={p}>
            Deux options utiles : ajuster le titre, la date ou la contrepartie pour élargir la portée,
            ou clôturer si le besoin n'est plus d'actualité.
          </Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={editUrl} style={btn}>Ajuster ma mission</Button>
          </Section>
          <Text style={pSmall}>
            Ou <a href={detailUrl} style={link}>voir ma mission et la clôturer</a>.
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
  subject: 'Votre mission attend toujours une réponse',
  displayName: 'Nudge mission sans réponse',
  previewData: { firstName: 'Marie', missionTitle: 'Sortir mon chien mardi soir', missionId: 'demo' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { color: '#1a1a1a', fontSize: '22px', fontWeight: 700, margin: '20px 0 12px 0' }
const p = { color: '#333', fontSize: '15px', lineHeight: '24px', margin: '0 0 14px 0' }
const pSmall = { color: '#666', fontSize: '13px', lineHeight: '20px', margin: '0 0 8px 0' }
const link = { color: '#2b6cb0', textDecoration: 'underline' }
const btn = { backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }
const hr = { borderColor: '#eee', margin: '20px 0' }
