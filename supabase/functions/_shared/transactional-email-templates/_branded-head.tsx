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
