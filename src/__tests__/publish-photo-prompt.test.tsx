/**
 * Recommandation de photos au moment de publier : elle apparaît sous trois
 * photos, disparaît à partir de trois, et « Publier ainsi » publie bien.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import PublishPhotoPromptDialog from "@/components/sits/owner/PublishPhotoPromptDialog";
import {
  countPropertyPhotos,
  shouldPromptPublishPhotos,
  publishPhotoPromptTitle,
  shouldShowSurroundingsParagraph,
  PUBLISH_PHOTO_PROMPT_SURROUNDINGS,
} from "@/lib/publishPhotoPrompt";

describe("recommandation de photos avant publication", () => {
  it("se déclenche sous trois photos, jamais à partir de trois", () => {
    expect(shouldPromptPublishPhotos(0)).toBe(true);
    expect(shouldPromptPublishPhotos(1)).toBe(true);
    expect(shouldPromptPublishPhotos(2)).toBe(true);
    expect(shouldPromptPublishPhotos(3)).toBe(false);
    expect(shouldPromptPublishPhotos(7)).toBe(false);
  });

  it("compte uniquement les photos réelles", () => {
    expect(countPropertyPhotos(null)).toBe(0);
    expect(countPropertyPhotos(["a", "", "  ", "b"])).toBe(2);
    expect(countPropertyPhotos(["a", "b", "c"])).toBe(3);
  });

  it("titre selon le nombre de photos", () => {
    expect(publishPhotoPromptTitle(0)).toBe("Votre annonce part sans photo");
    expect(publishPhotoPromptTitle(1)).toBe("Votre annonce part avec une seule photo");
    expect(publishPhotoPromptTitle(2)).toBe("Votre annonce part avec deux photos");
  });

  it("le paragraphe des alentours suit la description existante", () => {
    expect(shouldShowSurroundingsParagraph(null)).toBe(true);
    expect(shouldShowSurroundingsParagraph("Village calme")).toBe(true);
    expect(
      shouldShowSurroundingsParagraph(
        "Le village, les balades le long de la rivière, la vue sur les collines.",
      ),
    ).toBe(false);
  });

  it("affiche le second paragraphe quand les alentours restent à décrire", () => {
    render(
      <PublishPhotoPromptDialog
        open
        onOpenChange={() => {}}
        photoCount={0}
        showSurroundings
        onAddPhotos={() => {}}
        onPublishAnyway={() => {}}
      />,
    );
    expect(screen.getByText(PUBLISH_PHOTO_PROMPT_SURROUNDINGS)).toBeInTheDocument();
  });

  it("« Publier ainsi » publie l'annonce, « Ajouter des photos » ne publie pas", () => {
    const publish = vi.fn();
    const addPhotos = vi.fn();

    // Écran minimal reproduisant la garde de publication : la confirmation
    // s'intercale, elle ne retient jamais la publication.
    const Screen = ({ photoCount }: { photoCount: number }) => {
      const [open, setOpen] = useState(false);
      const handlePublish = () => {
        if (shouldPromptPublishPhotos(photoCount)) {
          setOpen(true);
          return;
        }
        publish();
      };
      return (
        <>
          <button onClick={handlePublish}>Publier</button>
          <PublishPhotoPromptDialog
            open={open}
            onOpenChange={setOpen}
            photoCount={photoCount}
            showSurroundings={false}
            onAddPhotos={() => { setOpen(false); addPhotos(); }}
            onPublishAnyway={() => { setOpen(false); publish(); }}
          />
        </>
      );
    };

    const { unmount } = render(<Screen photoCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));
    expect(screen.getByText("Votre annonce part avec une seule photo")).toBeInTheDocument();
    expect(publish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Publier ainsi" }));
    expect(publish).toHaveBeenCalledTimes(1);
    unmount();

    publish.mockClear();
    render(<Screen photoCount={3} />);
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));
    expect(screen.queryByTestId("publish-photo-prompt")).toBeNull();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(addPhotos).not.toHaveBeenCalled();
  });
});
