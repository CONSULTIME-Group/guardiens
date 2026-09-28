// Écrire à un membre depuis l'administration (lot M1).
// Réservé aux admins : vérification du jeton et du rôle côté serveur.
// mode "preview" : rend le gabarit réel, n'envoie rien.
// mode "send"    : un seul destinataire, via send-transactional-email.
import * as React from "npm:react@18.3.1";
import { render } from "npm:@react-email/components@0.0.22";
import { createClient } from "npm:@supabase/supabase-js@2";
import { template } from "../_shared/transactional-email-templates/admin-personal-message.tsx";
import {
  ADMIN_PERSONAL_TEMPLATE,
  adminPersonalLogMetadata,
  validateAdminPersonalInput,
} from "../_shared/admin-personal-message.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Contrôle admin : jeton utilisateur valide ET rôle admin. La clé de
  // service n'est pas acceptée ici, chaque envoi doit être signé par un admin.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json(401, { error: "Unauthorized" });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr || isAdmin !== true) return json(403, { error: "Forbidden: admin only" });
  const adminId = userData.user.id;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: "JSON invalide." });
  }
  const parsed = validateAdminPersonalInput(raw);
  if (!parsed.ok) return json(400, { error: parsed.error });
  const input = parsed.value;

  const templateData = {
    subject: input.subject,
    body: input.body,
    ...(input.linkLabel ? { linkLabel: input.linkLabel, linkUrl: input.linkUrl } : {}),
  };

  if (input.mode === "preview") {
    const html = render(React.createElement(template.component, templateData));
    return json(200, { html, subject: input.subject });
  }

  let recipientEmail = input.recipientEmail ?? "";
  if (!recipientEmail && input.recipientUserId) {
    const { data, error } = await admin.auth.admin.getUserById(input.recipientUserId);
    if (error || !data?.user?.email) return json(404, { error: "Adresse du membre introuvable." });
    recipientEmail = data.user.email;
  }

  const idempotencyKey = `admin-personal-${input.requestId ?? crypto.randomUUID()}`;
  const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      templateName: ADMIN_PERSONAL_TEMPLATE,
      recipientEmail,
      idempotencyKey,
      templateData,
      logMetadata: adminPersonalLogMetadata(input.sitId, adminId),
    }),
  });
  const payload = await res.json().catch(() => ({}));
  return json(res.ok ? 200 : res.status, payload);
});
