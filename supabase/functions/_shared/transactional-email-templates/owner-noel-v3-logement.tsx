/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Html, Preview, Section } from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { NOEL_V3_FOOTER_PURPOSE, NOEL_V3_PREVIEW, NoelV3Body, noelV3Preheader, v3Container, v3Main, type NoelV3Props } from './_owner-noel-v3-parts.tsx'
import { formatFirstName } from '../format-first-name.ts'
import { NOEL_V3_SUBJECTS } from '../owner-noel-v3.ts'
import type { TemplateEntry } from './registry.ts'

/** Email de Noël v3 (lot V1), variante « logement ». Maquettes Claude Design « Guardiens · Email Noël v3 ». */
const Email = (props: NoelV3Props) => {
  const p: NoelV3Props = { ...props, variant: 'logement' }
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{noelV3Preheader(p)}</Preview>
      <Body style={v3Main}>
        <Container style={v3Container}>
          <Section style={{ padding: '28px 40px 4px' }} className="em-pad"><BrandHeader /></Section>
          <NoelV3Body {...p} />
          <Section style={{ padding: '0 40px 28px' }} className="em-pad">
            <LegalFooter purpose={NOEL_V3_FOOTER_PURPOSE} basis="6.1.f" signoff={false} />
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) => NOEL_V3_SUBJECTS['logement'](formatFirstName(String(d.firstName ?? '').trim())),
  displayName: 'Propriétaires, Noël v3, trois questions',
  previewData: NOEL_V3_PREVIEW['logement'],
} satisfies TemplateEntry
