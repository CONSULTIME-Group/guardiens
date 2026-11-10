import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import { GOOGLE_REVIEW_URL } from "@/lib/constants";
import {
  ALLOWED_EXTERNAL_LINKS,
  GOOGLE_REVIEW_NOTIFICATION,
  GOOGLE_REVIEW_NOTIFICATION_TYPE,
  GOOGLE_REVIEW_PANEL_MESSAGE,
  GOOGLE_REVIEW_PEEK,
  isAllowedExternalLink,
} from "@/lib/alma/googleReview";
import { buildGoogleReviewWhisper, whisperPanelMessage } from "@/lib/alma/whisper-triggers";
import { parseAlmaMessage } from "@/components/ai/alma/AlmaConversation";
import { NOTIFICATION_KINDS } from "@/lib/notificationKinds";
import { NotificationItem } from "@/components/notifications/NotificationItem";

const read = (p: string) => readFileSync(p, "utf8");

describe("lot ALMA3, avis Google", () => {
  it("un seul lien externe autorisé, la fiche Guardiens vérifiée le 10/11/2026", () => {
    expect(GOOGLE_REVIEW_URL).toBe("https://g.page/r/CcG68dHWYoHIEAE/review");
    expect(ALLOWED_EXTERNAL_LINKS).toEqual([GOOGLE_REVIEW_URL]);
    expect(isAllowedExternalLink(GOOGLE_REVIEW_URL)).toBe(true);
    expect(isAllowedExternalLink("https://exemple.com/avis")).toBe(false);
    expect(isAllowedExternalLink("/dashboard")).toBe(false);
    expect(isAllowedExternalLink(null)).toBe(false);
  });

  it("le panneau d'Alma met le lien dans le mot « avis »", () => {
    const parsed = parseAlmaMessage(GOOGLE_REVIEW_PANEL_MESSAGE);
    const links = parsed.segments.filter((s) => s.type === "link");
    expect(links).toEqual([{ type: "link", href: GOOGLE_REVIEW_URL, title: "avis", external: true }]);
    expect(parsed.text).toContain("tout simplement, avec votre avis.");
    expect(parsed.links).toEqual([]);
  });

  it("un autre lien externe reste du texte", () => {
    const parsed = parseAlmaMessage("Donnez votre [avis](https://exemple.com/avis).");
    expect(parsed.segments.every((s) => s.type === "text")).toBe(true);
    expect(parsed.text).toBe("Donnez votre avis.");
  });

  it("aperçu court, panneau complet", () => {
    const w = buildGoogleReviewWhisper({ audience: "owner", surface: "owner_dashboard", peek: GOOGLE_REVIEW_PEEK, panelMessage: GOOGLE_REVIEW_PANEL_MESSAGE });
    expect(w.type).toBe("community_google_review");
    expect(w.priority).toBe("P2");
    expect(w.message).toBe(GOOGLE_REVIEW_PEEK);
    expect(GOOGLE_REVIEW_PEEK.length).toBeLessThanOrEqual(40);
    expect(whisperPanelMessage(w)).toBe(GOOGLE_REVIEW_PANEL_MESSAGE);
    expect(whisperPanelMessage({ ...w, metadata: {} })).toBe(GOOGLE_REVIEW_PEEK);
    expect(whisperPanelMessage(null)).toBeNull();
  });

  it("textes sans tiret ni tournure négative", () => {
    for (const t of [GOOGLE_REVIEW_PEEK, GOOGLE_REVIEW_PANEL_MESSAGE, GOOGLE_REVIEW_NOTIFICATION.title, GOOGLE_REVIEW_NOTIFICATION.body]) {
      expect(t).not.toMatch(/[–—]/);
      expect(t).not.toMatch(/\b(ne|n'|pas|jamais|aucun|rien)\b/i);
    }
  });

  it("la migration pose le même lien, le même type et le même texte", () => {
    const sql = read("drizzle/migrations/0131_alma3_invitation_avis_google.sql");
    expect(sql).toContain(`'${GOOGLE_REVIEW_URL}'`);
    expect(sql).toContain(`'${GOOGLE_REVIEW_NOTIFICATION_TYPE}'`);
    expect(sql).toContain(`'${GOOGLE_REVIEW_NOTIFICATION.title}'`);
    expect(sql).toContain(`'${GOOGLE_REVIEW_NOTIFICATION.body.replace(/'/g, "''")}'`);
    expect(sql).toMatch(/AND NOT EXISTS \(\s*SELECT 1 FROM public\.notifications n\s*WHERE n\.user_id = p\.id AND n\.type = 'google_review_invite'/);
    expect(NOTIFICATION_KINDS[GOOGLE_REVIEW_NOTIFICATION_TYPE]).toEqual({ tone: "info", category: "social" });
  });

  it("la page Notifications ouvre le formulaire Google dans un nouvel onglet et compte le clic", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const onMarkRead = vi.fn();
    render(
      <NotificationItem
        notification={{
          id: "n1",
          type: GOOGLE_REVIEW_NOTIFICATION_TYPE,
          title: GOOGLE_REVIEW_NOTIFICATION.title,
          body: GOOGLE_REVIEW_NOTIFICATION.body,
          link: GOOGLE_REVIEW_URL,
          read_at: null,
          created_at: new Date().toISOString(),
          actor_name: "Alma",
          actor_avatar_url: null,
        }}
        onMarkRead={onMarkRead}
        onDelete={vi.fn()}
      />,
    );
    const a = screen.getByRole("link", { name: GOOGLE_REVIEW_NOTIFICATION.title });
    expect(a.getAttribute("href")).toBe(GOOGLE_REVIEW_URL);
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    fireEvent.click(a);
    expect(open).toHaveBeenCalledWith(GOOGLE_REVIEW_URL, "_blank", "noopener,noreferrer");
    expect(onMarkRead).toHaveBeenCalledWith("n1");
    open.mockRestore();
  });

  it("cloche, dock et murmure branchés", () => {
    expect(read("src/components/layout/NotificationBell.tsx")).toContain('openGoogleReview("notification_bell")');
    const dock = read("src/components/ai/alma/AlmaDock.tsx");
    expect(dock).toContain("whisperMessage: entryContext?.instantLine ?? whisperPanelMessage(whisper),");
    expect(dock).toContain("journal={whisperOwnsPanel ? null : journal}");
    expect(dock).toContain('}, "google_review");');
    const wiring = read("src/components/ai/alma/wiring/AlmaGoogleReviewWhisper.tsx");
    expect(wiring).toContain('if (pathname !== "/dashboard") return;');
    expect(wiring).toContain("if (alreadyShown(userId)) return;");
    expect(read("src/components/layout/AppLayout.tsx")).toContain("<AlmaGoogleReviewWhisper />");
  });
});
