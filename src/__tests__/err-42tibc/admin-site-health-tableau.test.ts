/**
 * Erreur 42tibc (29/10/2026) : admin_site_health en 400 « malformed array
 * literal » dès qu'un signal d'envoi était ouvert. Un littéral non typé ajouté
 * à un text[] par || est lu comme un tableau : on passe par array_append.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(resolve(process.cwd(), "drizzle/migrations/0111_err_admin_site_health_tableau.sql"), "utf8");

describe("admin_site_health, ajouts au tableau des emails", () => {
  it("les deux libellés passent par array_append", () => {
    expect(sql).toMatch(/array_append\(v_email_bad, 'signal d''envoi ouvert'\)/);
    expect(sql).toMatch(/array_append\(v_email_bad, 'envois bloqués par la limite de débit'\)/);
  });
  it("la migration échoue si un ajout de littéral non typé subsiste", () => {
    expect(sql).toMatch(/RAISE EXCEPTION 'admin_site_health : ajout de littéral non typé restant'/);
  });
});
