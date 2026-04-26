import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"

interface ReportResolvedProps {
  reason?: string
  status?: string
  adminNotes?: string
}

const statusLabels: Record<string, string> = {
  resolved: "traité",
  in_progress: "en cours de traitement",
}

const reasonLabels: Record<string, string> = {
  inappropriate: "Contenu inapproprié",
  fake_profile: "Faux profil",
  harassment: "Harcèlement",
  fraud: "Annonce frauduleuse",
  misleading: "Annonce trompeuse",
  other: "Autre",
}

const ReportResolvedEmail = ({ reason, status, adminNotes }: ReportResolvedProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre signalement a été {statusLabels[status || 'resolved'] || 'traité'} — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Mise à jour de votre signalement
        </Heading>
        <Text style={text}>
          Bonjour,
        </Text>
        <Text style={text}>
          Nous avons bien examiné votre signalement{reason ? ` pour motif « ${reasonLabels[reason] || reason} »` : ''}.
          Celui-ci est maintenant <strong>{statusLabels[status || 'resolved'] || 'traité'}</strong>.
        </Text>
        {adminNotes ? (
          <>
            <Hr style={hr} />
            <Text style={noteLabel}>Note de l'équipe :</Text>
            <Text style={noteText}>{adminNotes}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={text}>
          Merci de contribuer à la sécurité de notre communauté. Si vous avez des questions, n'hésitez pas à nous contacter.
        </Text>
        <Text style={legal}>
          Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
          dans le cadre de l'intérêt légitime lié à la modération de la communauté (art. 6.1.f RGPD).
          Pour exercer vos droits : contact@guardiens.fr.
        </Text>
        <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReportResolvedEmail,
  subject: 'Votre signalement a été traité',
  displayName: 'Signalement traité',
  previewData: { reason: 'inappropriate', status: 'resolved', adminNotes: 'Le contenu a été retiré.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const noteLabel = { fontSize: '13px', fontWeight: 'bold' as const, color: 'hsl(40, 12%, 10%)', margin: '0 0 6px' }
const noteText = { fontSize: '14px', color: 'hsl(40, 12%, 10%)', lineHeight: '1.5', margin: '0 0 16px', padding: '12px 16px', backgroundColor: 'hsl(37, 22%, 93%)', borderRadius: '8px' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
