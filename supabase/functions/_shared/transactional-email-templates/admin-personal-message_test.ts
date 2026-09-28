import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import * as React from "npm:react@18.3.1";
import { render } from "npm:@react-email/components@0.0.22";
import { template } from "./admin-personal-message.tsx";
import { TEMPLATES } from "./registry.ts";
import { getEmailCategory } from "../email-categories.ts";
import { transactionalSender } from "../sender-address.ts";

const data = {
  subject: "Votre annonce est en ligne",
  body: "Bonjour Françoise,\n\nPremier paragraphe.\nSuite sur une ligne.\n\n\nBelle journée à vous,",
  linkLabel: "Voir mon annonce",
  linkUrl: "https://guardiens.fr/sits/cb5cbe6f-54bd-4fae-9418-a37d7d602784",
};

Deno.test("admin-personal-message : paragraphes, lien, signature unique", () => {
  const html = render(React.createElement(template.component, data));
  assert(html.includes("Bonjour Françoise,"));
  assert(html.includes("Premier paragraphe.<br/>Suite sur une ligne."));
  assert(html.includes('href="https://guardiens.fr/sits/cb5cbe6f-54bd-4fae-9418-a37d7d602784"'));
  assert(html.includes("Voir mon annonce"));
  assert(html.includes("Jérémie, Guardiens"));
  assert(!html.includes("L&#x27;équipe Guardiens") && !html.includes("L'équipe Guardiens"));
  assert(!/[\u2013\u2014]/.test(html), "aucun tiret long ni demi-cadratin");
});

Deno.test("admin-personal-message : sans lien, aucun bouton", () => {
  const html = render(React.createElement(template.component, { ...data, linkLabel: undefined, linkUrl: undefined }));
  assert(!html.includes("Voir mon annonce"));
});

Deno.test("admin-personal-message : objet, registre, catégorie, expéditeur", () => {
  assertEquals((template.subject as (d: Record<string, unknown>) => string)(data), data.subject);
  assert(TEMPLATES["admin-personal-message"]);
  assertEquals(getEmailCategory("admin-personal-message"), "transactional");
  assertEquals(
    transactionalSender("admin-personal-message", "Guardiens", "guardiens.fr"),
    transactionalSender("founder-personal-notice", "Guardiens", "guardiens.fr"),
  );
});
