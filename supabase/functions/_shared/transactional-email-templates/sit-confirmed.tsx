import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props {
  sitTitle?: string
  sitterFirstName?: string
  startDate?: string
  endDate?: string
  petNames?: string
  sitId?: string
}

const SitConfirmedEmail = ({
  sitTitle,
  sitterFirstName,
  startDate,
  endDate,
  petNames,
  sitId,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Garde confirmée — votre gardien est sélectionné</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Garde confirmée 🎉</Heading>
        <Text style={text}>
          Vous avez sélectionné <strong>{sitterFirstName || 'un gardien'}</strong> pour
          {sitTitle ? ` votre garde « ${sitTitle} »` : ' votre garde'}.
          Tout est en place !
        </Text>

        <Section style={card}>
          {petNames && (
            <Text style={cardLine}>
              <strong>Animaux :</strong> {petNames}
            </Text>
          )}
          {(startDate || endDate) && (
            <Text style={cardLine}>
              <strong>Dates :</strong> {startDate || '—'} → {endDate || '—'}
            </Text>
          )}
          <Text style={cardLine}>
            <strong>Gardien :</strong> {sitterFirstName || '—'}
          </Text>
        </Section>

        <Text style={text}>
          <strong>Prochaines étapes :</strong>
        </Text>
        <Text style={text}>
          • Échangez avec votre gardien dans la messagerie pour préparer la garde.<br />
          • Complétez ou partagez votre <strong>guide de la maison</strong> (accès, codes, contacts utiles).<br />
          • Pensez à signer l'<strong>accord de garde</strong> ensemble pour formaliser les engagements.
        </Text>

        <Button style={button} href={`${SITE_URL}/sits/${sitId || ''}`}>
          Voir la garde
        </Button>

        <Hr style={hr} />
        <Text style={legal}>
          Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
          dans le cadre de la confirmation de votre garde (art. 6.1.b RGPD — exécution du contrat).
          Pour exercer vos droits : contact@guardiens.fr.
        </Text>
        <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SitConfirmedEmail,
  subject: (data: Record<string, any>) =>
    data?.sitterFirstName
      ? `Garde confirmée avec ${data.sitterFirstName} 🎉`
      : 'Garde confirmée 🎉',
  displayName: 'Garde confirmée (propriétaire)',
  previewData: {
    sitTitle: 'Garde Mistigri & Pacha',
    sitterFirstName: 'Camille',
    startDate: '12 juillet 2026',
    endDate: '20 juillet 2026',
    petNames: 'Mistigri, Pacha',
    sitId: 'demo',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: 'hsl(37, 35%, 96%)', borderRadius: '8px', padding: '14px 16px', margin: '12px 0 20px' }
const cardLine = { fontSize: '13px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', margin: '0 0 6px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
