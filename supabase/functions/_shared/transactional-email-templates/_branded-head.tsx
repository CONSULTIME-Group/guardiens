/// <reference types="npm:@types/react@18.3.1" />
//
// `<BrandedHead />` — variante pour les templates TRANSACTIONNELS.
//
// Identique au helper auth (`_shared/email-templates/_branded-head.tsx`)
// mais dupliqué ici pour respecter l'isolation entre les deux dossiers
// `_shared/email-templates/` (auth) et `_shared/transactional-email-templates/`
// (transactionnel) — un import croisé pourrait casser le bundling Deno
// d'une fonction qui ne charge qu'un seul des deux dossiers.
//
// Voir le helper auth pour le détail des choix techniques (force light,
// fixes Outlook mso, reset iOS auto-detect).

import * as React from 'npm:react@18.3.1'
import { Head } from 'npm:@react-email/components@0.0.22'

const MSO_RESET = `
  body, table, td, a {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  table, td {
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
  }
  body, p, h1, h2, h3, h4, h5, h6, span, div, td, th {
    mso-line-height-rule: exactly;
  }
  a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
  }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  @media only screen and (max-width: 600px) {
    .em-container { padding: 20px 16px !important; border-radius: 0 !important; max-width: 100% !important; }
    .em-hero { padding: 18px 16px !important; margin: 0 0 20px !important; }
    .em-h1 { font-size: 22px !important; line-height: 1.25 !important; }
    .em-text { font-size: 15px !important; line-height: 1.6 !important; }
    .em-card { padding: 14px 16px !important; }
    .em-card-title { font-size: 14px !important; }
    .em-card-line { font-size: 14px !important; line-height: 22px !important; }
    .em-cta { margin: 24px 0 8px !important; }
    .em-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 16px 20px !important; font-size: 16px !important; }
    .em-hint { font-size: 12px !important; }
  }
`

export const BrandedHead = () => (
  <Head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
    <meta name="color-scheme" content="only light" />
    <meta name="supported-color-schemes" content="light" />
    <style>{MSO_RESET}</style>
    <div
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: '<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->',
      }}
    />
  </Head>
)

export default BrandedHead
