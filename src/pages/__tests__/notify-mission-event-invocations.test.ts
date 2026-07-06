import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";

/**
 * Guard test : garantit que SmallMissionDetail.tsx invoque bien
 * `notify-mission-event` avec le bon `event_type`, un `actor_id`
 * dérivé du user courant et des `target_ids` cohérents pour chacun
 * des 7 chemins produit (proposal / accepted / declined unitaire /
 * declined cascade / cancelled / completed / response_withdrawn).
 *
 * Le fan-out email est délégué à l'edge function (registry + templates
 * `mission-*` couverts par registry-completeness_test côté serveur),
 * donc valider la bonne signature d'invocation ici suffit à garantir
 * que l'email sera créé.
 */

const source = readFileSync(
  resolve(__dirname, "../SmallMissionDetail.tsx"),
  "utf8",
);

function extractInvocations(): Array<{ block: string }> {
  const re = /supabase\.functions\.invoke\("notify-mission-event",\s*\{[\s\S]*?\}\)\.catch/g;
  const blocks: Array<{ block: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    blocks.push({ block: m[0] });
  }
  return blocks;
}

describe("SmallMissionDetail → notify-mission-event", () => {
  const blocks = extractInvocations();

  it("expose exactement 7 invocations (1 par chemin fonctionnel)", () => {
    expect(blocks.length).toBe(7);
  });

  const expected: Array<{ event: string; targetShape: RegExp }> = [
    { event: "mission_proposal", targetShape: /target_ids:\s*\[fresh\.user_id\]/ },
    { event: "mission_declined", targetShape: /target_ids:\s*pendingOthers\.map\(r\s*=>\s*r\.responder_id\)/ },
    { event: "mission_accepted", targetShape: /target_ids:\s*\[resp\.responder_id\]/ },
    { event: "mission_declined", targetShape: /target_ids:\s*\[resp\.responder_id\]/ },
    { event: "mission_cancelled", targetShape: /target_ids:\s*pending\.map\(r\s*=>\s*r\.responder_id\)/ },
    { event: "mission_completed", targetShape: /target_ids:\s*accepted\.map\(r\s*=>\s*r\.responder_id\)/ },
    { event: "mission_response_withdrawn", targetShape: /target_ids:\s*\[mission\.user_id\]/ },
  ];

  it.each(expected)(
    "invoque $event avec des target_ids cohérents et un actor_id user-scoped",
    ({ event, targetShape }) => {
      const match = blocks.find(
        (b) => b.block.includes(`event_type: "${event}"`) && targetShape.test(b.block),
      );
      expect(match, `bloc introuvable pour ${event}`).toBeTruthy();
      // actor_id doit venir du user courant (jamais un id littéral / hardcodé)
      expect(match!.block).toMatch(/actor_id:\s*user!?\.id/);
      // mission_id est toujours l'id de l'URL
      expect(match!.block).toMatch(/mission_id:\s*id/);
    },
  );

  it("n'insère plus jamais directement dans notifications ni n'appelle sendTransactionalEmail", () => {
    expect(source).not.toMatch(/from\("notifications"\)\.insert/);
    expect(source).not.toMatch(/sendTransactionalEmail\(/);
    expect(source).not.toMatch(/from ["']@\/lib\/sendTransactionalEmail["']/);
  });
});
