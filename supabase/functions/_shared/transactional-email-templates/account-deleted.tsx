import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  firstName?: string
}

const AccountDeletedEmail = ({ firstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre compte et vos données ont été supprimés</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Votre compte a été supprimé</Heading>
        <Text style={text}>
          {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
        </Text>
        <Text style={text}>
          Nous confirmons la suppression de votre compte Guardiens et l'effacement des
          données personnelles associées : profil, photos, annonces, messages et réponses
          d'entraide.
        </Text>
        <Text style={text}>
          Votre adresse email a également été ajoutée à notre liste de blocage, afin de ne
          plus recevoir aucun message de notre part.
        </Text>
        <Text style={text}>
          Certaines données peuvent être conservées de façon limitée lorsque la loi l'exige
          (obligations comptables, preuves en cas de litige). Pour toute question relative à
          vos droits, écrivez à contact@guardiens.fr.
        </Text>
        <LegalFooter
          purpose="du traitement de votre demande de suppression de compte et d'effacement de vos données"
          basis="6.1.b"
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountDeletedEmail,
  subject: 'Votre compte et vos données ont été supprimés',
  displayName: 'Compte supprimé (accusé RGPD)',
  previewData: { firstName: 'Camille' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
