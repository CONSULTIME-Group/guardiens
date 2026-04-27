/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { LegalFooter } from './_legal-footer.tsx'
import { BrandedHead } from './_branded-head.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Confirmez votre adresse email et démarrez sur {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={logo}>
          <span style={{ color: '#3d7a5f' }}>g</span>uardiens
        </Heading>

        <Heading style={h1}>Bienvenue sur {siteName}.</Heading>

        <Text style={text}>
          Merci d'avoir rejoint{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          , la communauté locale d'entraide entre propriétaires et gardiens d'animaux.
        </Text>

        <Text style={text}>
          Pour activer votre compte ({' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ), confirmez votre adresse email en cliquant sur le bouton ci-dessous.
        </Text>

        <Section style={ctaSection}>
          <Button style={button} href={confirmationUrl}>
            Confirmer mon email
          </Button>
        </Section>

        <Hr style={hr} />

        <Heading as="h2" style={h2}>
          Une fois votre email confirmé
        </Heading>

        <Text style={stepText}>
          <strong>1.</strong> Complétez votre profil (prénom, ville, photo, bio).
        </Text>
        <Text style={stepText}>
          <strong>2.</strong> Précisez votre expérience avec les animaux pour rassurer la communauté.
        </Text>
        <Text style={stepText}>
          <strong>3.</strong> Explorez les annonces près de chez vous ou publiez la vôtre.
        </Text>
        <Text style={stepText}>
          <strong>4.</strong> Échangez en toute sérénité via la messagerie intégrée.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Si vous n'avez pas créé de compte sur {siteName}, ignorez simplement cet email.
        </Text>
        <LegalFooter />
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  fontFamily: "'Playfair Display', Georgia, serif",
  color: '#1a1a1a',
  margin: '0 0 30px',
  textAlign: 'center' as const,
}
const h1 = {
  fontSize: '22px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 20px',
}
const h2 = {
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#6b6b6b',
  lineHeight: '1.6',
  margin: '0 0 18px',
}
const stepText = {
  fontSize: '14px',
  color: '#4a4a4a',
  lineHeight: '1.6',
  margin: '0 0 10px',
}
const link = { color: '#3d7a5f', textDecoration: 'underline' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#3d7a5f',
  color: '#f7f5f2',
  fontSize: '15px',
  fontWeight: '500' as const,
  borderRadius: '16px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const hr = { borderColor: '#eeeeee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
