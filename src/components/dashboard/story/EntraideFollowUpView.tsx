import MeetupAnswer from "@/components/entraide/MeetupAnswer";
import { HelpProposalsList, type HelpRow } from "@/components/dashboard/MesCoupsDeMain";
import type { HelpProposal } from "@/lib/myHelpProposals";
import DashEyebrow from "@/components/dashboard/owner/DashEyebrow";

interface Props {
  exchanges: HelpRow[];
  proposals: HelpProposal[];
  busyId?: string | null;
  onAnswer?: (missionId: string, happened: boolean, word: string, publicOk: boolean, cancelled?: boolean) => void;
}

/** Vrai quand le bloc a quelque chose à montrer : réponse attendue ou propositions à suivre. */
export function hasEntraideFollowUp(exchanges: HelpRow[], proposals: HelpProposal[]): boolean {
  return exchanges.some((r) => r.status === "in_progress" && !r.answered) || proposals.length > 0;
}

export function EntraideFollowUpView({ exchanges, proposals, busyId, onAnswer }: Props) {
  if (!hasEntraideFollowUp(exchanges, proposals)) return null;
  const ongoing = exchanges.find((r) => r.status === "in_progress" && !r.answered) ?? null;
  return (
    <section aria-label="Vos coups de main" data-testid="entraide-follow-up" className="rounded-[20px] p-[16px]" style={{ backgroundColor: "hsl(var(--secondary) / 0.08)" }}>
      <DashEyebrow>Vos coups de main</DashEyebrow>
      {ongoing && (
        <div className="mt-[10px] rounded-[14px] bg-card px-[16px] py-[12px]" data-testid="entraide-ongoing">
          <p className="text-foreground text-[14px] font-semibold">
            {ongoing.title}
            <span className="font-normal text-muted-foreground">
              {" "}· {ongoing.role === "owner" ? "avec" : "pour"} {ongoing.other_first_name}
            </span>
          </p>
          <p className="mt-[6px] mb-[8px] text-muted-foreground text-[13px]">Le coup de main a eu lieu ?</p>
          <MeetupAnswer
            otherFirstName={ongoing.other_first_name}
            busy={busyId === ongoing.id}
            onYes={(word, publicOk) => onAnswer?.(ongoing.id, true, word, publicOk)}
            onNo={() => onAnswer?.(ongoing.id, false, "", false)}
            onCancelled={() => onAnswer?.(ongoing.id, false, "", false, true)}
            missionId={ongoing.id}
          />
        </div>
      )}
      <HelpProposalsList proposals={proposals} />
    </section>
  );
}
