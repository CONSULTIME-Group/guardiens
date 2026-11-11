import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Link, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

// Lot ADM22 : alerte immédiate à un admin qui l'a choisie dans
// Paramètres > Notifications. Une seule ligne, texte constant, sans nom de
// membre ni extrait. Le destinataire vient de la file (adresse du compte
// admin) : ce gabarit n'a volontairement aucun destinataire fixe.

interface Props {
  subject?: string
  title?: string
  action?: string
  link?: string
}

const DEFAULT_SUBJECT = 'Guardiens admin : une alerte à regarder'

const Email = ({ title = 'Une alerte à regarder', action = '', link = 'https://guardiens.fr/admin' }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>{title}</Heading>
        {action ? <Text style={text}>{action}</Text> : null}
        <Section style={item}>
          <Link href={link} style={linkStyle}>Ouvrir dans l'administration</Link>
        </Section>
        <Text style={small}>
          Vous recevez cet email parce que vous avez activé cette alerte dans Paramètres, Notifications, Alertes de l'équipe.
        </Text>
        <LegalFooter purpose="du pilotage de Guardiens" signoff={false} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => data.subject || DEFAULT_SUBJECT,
  displayName: "Admin, alerte de l'équipe",
  previewData: {
    subject: 'Guardiens admin : un message de contact à lire',
    title: 'Répondre à 1 message de contact',
    action: "Un message vient d'arriver par le formulaire de contact. Il attend une réponse dans l'administration.",
    link: 'https://guardiens.fr/admin/contact-messages',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '20px', fontWeight: 600, color: '#1f2937', margin: '16px 0' }
const text = { fontSize: '14px', lineHeight: '20px', color: '#374151' }
const small = { fontSize: '12px', lineHeight: '18px', color: '#6b7280', margin: '16px 0 0' }
const item = { backgroundColor: '#f9fafb', padding: '12px 14px', borderRadius: '8px', margin: '10px 0' }
const linkStyle = { color: '#111827', textDecoration: 'underline', fontSize: '14px', fontWeight: 600 }
