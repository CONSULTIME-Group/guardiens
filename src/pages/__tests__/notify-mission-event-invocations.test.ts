import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";

/**
 * Guard test : garantit que SmallMissionDetail.tsx invoque bien
 * `notify-mission-event` avec le bon `event_type`, un `actor_id`
 * dérivé du user courant et des `target_ids` cohérents pour chacun
 * des 6 chemins produit (accepted / declined unitaire / declined
 * cascade / cancelled / completed / response_withdrawn).
 *
 * Le fan-out email est délégué à l'edge function (registry + templates
 * `mission-*` couverts par registry-completeness_test côté serveur),
 * donc valider la bonne signature d'invocation ici suffit à garantir
 * que l'email sera créé.
 *
 * Refontes prises en compte (confirmées par lecture du code le 17/08/2026,
 * les 6 invocations existent toujours dans SmallMissionDetail.tsx) :
 * - 20/07/2026 : la cascade de déclinaison est calculée côté serveur,
 *   le client envoie `target_ids: declinedIds` (result.declined_responder_ids)
 *   au lieu de `pendingOthers.map(...)`.
 * - 10/08/2026 : `mission_id: missionUuid!` (mission?.id chargé depuis
 *   l'id d'URL) remplace `mission_id: id`.
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

  it("expose exactement 6 invocations (mission_proposal est désormais géré côté serveur par le trigger notify_new_mission_response)", () => {
    expect(blocks.length).toBe(6);
  });

  const expected: Array<{ event: string; targetShape: RegExp }> = [
    // Cascade : liste calculée côté serveur depuis la refonte du 20/07/2026.
    { event: "mission_declined", targetShape: /target_ids:\s*declinedIds/ },
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
      // mission_id est missionUuid, c'est-à-dire mission?.id chargé depuis
      // l'id de l'URL (refonte du 10/08/2026).
      expect(match!.block).toMatch(/mission_id:\s*missionUuid!/);
    },
  );

  it("n'insère plus jamais directement dans notifications ni n'appelle sendTransactionalEmail", () => {
    expect(source).not.toMatch(/from\("notifications"\)\.insert/);
    expect(source).not.toMatch(/sendTransactionalEmail\(/);
    expect(source).not.toMatch(/from ["']@\/lib\/sendTransactionalEmail["']/);
  });
});
