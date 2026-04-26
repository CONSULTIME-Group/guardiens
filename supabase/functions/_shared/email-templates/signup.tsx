/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { LegalFooter } from './_legal-footer.tsx'

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
    <Head />
    <Preview>Confirmez votre adresse email — Guardiens</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={logo}>
          <span style={{ color: '#3d7a5f' }}>g</span>uardiens
        </Heading>
        <Heading style={h1}>Vous venez de rejoindre {siteName}.</Heading>
        <Text style={text}>
          Merci pour votre inscription sur{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          Pour activer votre compte, confirmez votre adresse email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) en cliquant sur le bouton ci-dessous.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer mon email
        </Button>
        <Text style={footer}>
          Si vous n'avez pas créé de compte, ignorez simplement cet email.
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
const text = {
  fontSize: '15px',
  color: '#6b6b6b',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const link = { color: '#3d7a5f', textDecoration: 'underline' }
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
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
