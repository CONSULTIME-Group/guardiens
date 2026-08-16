import { describe, it, expect } from "vitest";
import { getSignupRedirectUrl } from "../authRedirect";

/**
 * Le lien de confirmation email doit conserver la destination post-inscription,
 * y compris le marqueur source=signup du tunnel propriétaire (lot 1,
 * 16/08/2026), sans jamais ouvrir de redirection externe.
 */
describe("getSignupRedirectUrl", () => {
  it("conserve la query string sûre du tunnel propriétaire", () => {
    const url = getSignupRedirectUrl("/sits/create?source=signup");
    expect(url).toContain("/auth/confirm?next=");
    expect(url).toContain(encodeURIComponent("/sits/create?source=signup"));
  });

  it("retombe sur le tableau de bord pour une cible externe ou relative", () => {
    expect(getSignupRedirectUrl("https://evil.example")).toContain(
      encodeURIComponent("/dashboard"),
    );
    expect(getSignupRedirectUrl("//evil.example")).toContain(
      encodeURIComponent("/dashboard"),
    );
  });

  it("écarte une query string aux caractères douteux mais garde le chemin", () => {
    const url = getSignupRedirectUrl('/sits/create?x=<script>"');
    expect(url).toContain(encodeURIComponent("/sits/create"));
    expect(url).not.toContain("script");
  });
});
