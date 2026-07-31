/**
 * HARNAIS DE TEST TEMPORAIRE, à supprimer immédiatement après la campagne.
 *
 * Exécute la chaîne complète de vérification d'identité sur un compte de test
 * jetable, sans jamais toucher à un compte réel et sans envoi d'email
 * (l'adresse de test est placée en liste de suppression dès sa création).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const QA_TOKEN = "qa-identity-e2e-2026-07-31";
const TEST_EMAIL = "qa-identity-e2e@guardiens-test.invalid";
const TEST_PASSWORD = "Qa!identity-e2e-2026-Xy";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b, null, 2), { status: s, headers: { "Content-Type": "application/json" } });

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.headers.get("x-qa-token") !== QA_TOKEN) return json({ error: "forbidden" }, 403);
  const admin = createClient(URL_, SRK);
  const body = await req.json().catch(() => ({}));
  const step = body.step as string;

  try {
    if (step === "setup") {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      let u = list.users.find((x) => x.email === TEST_EMAIL);
      if (!u) {
        const { data, error } = await admin.auth.admin.createUser({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          email_confirm: true,
          user_metadata: { first_name: "QA", last_name: "Identity", role: "sitter" },
        });
        if (error) return json({ step, error: error.message }, 500);
        u = data.user;
      }
      await admin.from("suppressed_emails").upsert(
        { email: TEST_EMAIL, reason: "qa_test_account_no_send" },
        { onConflict: "email" },
      );
      const anonC = createClient(URL_, ANON);
      const { data: sess, error: sErr } = await anonC.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (sErr) return json({ step, error: sErr.message }, 500);
      const { data: prof } = await admin.from("profiles").select("id, identity_verified, identity_verification_status").eq("id", u!.id).maybeSingle();
      return json({ step, user_id: u!.id, access_token: sess.session!.access_token, profile: prof, suppressed: true });
    }

    const token = body.access_token as string;
    const userId = body.user_id as string;
    const asUser = createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });

    if (step === "upload") {
      // Reproduit exactement le chemin client : upload dans le bucket privé
      // puis bascule du profil vers `pending`, avec le JWT de l'utilisateur.
      const bytes = Uint8Array.from(atob(body.base64 as string), (c) => c.charCodeAt(0));
      const path = `${userId}/identity-document.${body.ext}`;
      await asUser.storage.from("identity-documents").remove([path]);
      const { error: upErr } = await asUser.storage
        .from("identity-documents")
        .upload(path, bytes, { upsert: true, contentType: body.contentType });
      if (upErr) return json({ step, stage: "upload", error: upErr.message, size: bytes.length }, 200);
      const { error: pErr } = await asUser
        .from("profiles")
        .update({ identity_document_url: path, identity_verification_status: "pending" })
        .eq("id", userId);
      const { data: obj } = await admin.storage.from("identity-documents").list(userId);
      const { data: prof } = await admin
        .from("profiles")
        .select("identity_document_url, identity_verification_status, identity_verified")
        .eq("id", userId)
        .single();
      return json({ step, uploaded: true, size: bytes.length, bucket_objects: obj, profile_update_error: pErr?.message ?? null, profile: prof });
    }

    if (step === "verify") {
      const t0 = Date.now();
      const res = await fetch(`${URL_}/functions/v1/verify-identity`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, apikey: ANON, "Content-Type": "application/json" },
        body: "{}",
      });
      const text = await res.text();
      const { data: prof } = await admin
        .from("profiles")
        .select("identity_verified, identity_verification_status")
        .eq("id", userId)
        .single();
      const { data: logs } = await admin
        .from("identity_verification_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      const { data: notifs } = await admin
        .from("notifications")
        .select("type, title")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      return json({ step, http_status: res.status, ms: Date.now() - t0, response: text.slice(0, 1200), profile: prof, logs, notifications: notifs });
    }

    if (step === "fill_logs") {
      const rows = Array.from({ length: body.n ?? 5 }, () => ({ user_id: userId, result: "rejected", rejection_reason: "qa rate limit filler" }));
      const { error } = await admin.from("identity_verification_logs").insert(rows);
      const { count } = await admin
        .from("identity_verification_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return json({ step, inserted: rows.length, error: error?.message ?? null, total_logs: count });
    }

    if (step === "grant_admin" || step === "revoke_admin") {
      if (step === "grant_admin") {
        const { error } = await admin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        return json({ step, error: error?.message ?? null });
      }
      const { error } = await admin.from("user_roles").delete().eq("user_id", userId);
      return json({ step, error: error?.message ?? null });
    }

    if (step === "admin_action") {
      const res = await fetch(`${URL_}/functions/v1/admin-manage-identity-verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ action: body.action, userId, reason: body.reason }),
      });
      const text = await res.text();
      const { data: prof } = await admin
        .from("profiles")
        .select("identity_verified, identity_verification_status")
        .eq("id", userId)
        .single();
      const { data: logs } = await admin
        .from("identity_verification_logs")
        .select("result, rejection_reason, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      return json({ step, action: body.action, http_status: res.status, response: text.slice(0, 600), profile: prof, logs });
    }

    if (step === "set_status") {
      const { error } = await admin
        .from("profiles")
        .update({ identity_verification_status: body.status, identity_verified: body.status === "verified" })
        .eq("id", userId);
      return json({ step, status: body.status, error: error?.message ?? null });
    }

    if (step === "email_check") {
      const { data } = await admin
        .from("email_send_log")
        .select("template_name, status, created_at, recipient_email")
        .eq("recipient_email", TEST_EMAIL)
        .order("created_at", { ascending: false })
        .limit(10);
      return json({ step, email_send_log: data });
    }

    if (step === "cleanup") {
      const report: Record<string, unknown> = {};
      const { data: files } = await admin.storage.from("identity-documents").list(userId);
      if (files?.length) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        const { error } = await admin.storage.from("identity-documents").remove(paths);
        report.storage_removed = paths;
        report.storage_error = error?.message ?? null;
      } else report.storage_removed = [];
      for (const t of ["identity_verification_logs", "notifications", "analytics_events", "user_roles", "email_send_log"]) {
        const { count, error } = await admin.from(t).delete({ count: "exact" }).eq("user_id", userId);
        report[t] = error ? `error: ${error.message}` : count;
      }
      const { count: profCount } = await admin.from("profiles").delete({ count: "exact" }).eq("id", userId);
      report.profiles = profCount;
      const { error: supErr } = await admin.from("suppressed_emails").delete().eq("email", TEST_EMAIL);
      report.suppressed_emails = supErr?.message ?? "deleted";
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      report.auth_user = delErr?.message ?? "deleted";
      const { data: leftover } = await admin.storage.from("identity-documents").list(userId);
      report.storage_leftover = leftover?.length ?? 0;
      return json({ step, report });
    }

    return json({ error: "unknown step" }, 400);
  } catch (e) {
    return json({ step, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack?.slice(0, 800) : null }, 500);
  }
});
