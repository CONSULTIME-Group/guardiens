// Lot PUB2 : photo ajoutée comptée tout de suite, photo illisible expliquée,
// pastille d'Alma retirée du formulaire d'annonce.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { countPropertyPhotos, publishPhotoPromptTitle, withUploadedPhoto } from "@/lib/publishPhotoPrompt";
import { isAlmaPillHiddenOn } from "@/lib/alma/dockPillVisibility";

vi.mock("@/lib/compressImage", () => ({ compressImageFile: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: vi.fn() }, from: vi.fn() } }));
import { compressImageFile } from "@/lib/compressImage";
import {
  PHOTO_UNREADABLE_MESSAGE,
  PHOTO_UPLOAD_INTERRUPTED_MESSAGE,
  PhotoUnreadableError,
  photoUploadErrorMessage,
  uploadOwnerGalleryPhoto,
} from "@/lib/uploadOwnerGalleryPhoto";

describe("photo ajoutée depuis le formulaire", () => {
  it("un logement sans photo passe à une photo : le message ne dit plus « sans photo »", () => {
    const photos = withUploadedPhoto([], "https://x/a.webp");
    expect(countPropertyPhotos(photos)).toBe(1);
    expect(publishPhotoPromptTitle(countPropertyPhotos(photos))).toBe("Votre annonce part avec une seule photo");
  });

  it("une même adresse n'est comptée qu'une fois, en fin de liste", () => {
    expect(withUploadedPhoto(["https://x/a.webp", "https://x/b.webp"], "https://x/a.webp")).toEqual(["https://x/b.webp", "https://x/a.webp"]);
    expect(withUploadedPhoto(null, "https://x/c.webp")).toEqual(["https://x/c.webp"]);
  });
});

describe("photo illisible", () => {
  beforeEach(() => vi.mocked(compressImageFile).mockReset());

  it("un fichier que le navigateur ne lit pas lève PhotoUnreadableError, sans rien envoyer", async () => {
    vi.mocked(compressImageFile).mockRejectedValueOnce(new Event("error"));
    const file = new File([new Uint8Array([1, 2, 3])], "casse.jpg", { type: "image/jpeg" });
    await expect(uploadOwnerGalleryPhoto("u1", file)).rejects.toBeInstanceOf(PhotoUnreadableError);
  });

  it("le message dit de choisir une autre photo, pas de réessayer", () => {
    expect(photoUploadErrorMessage(new PhotoUnreadableError())).toBe(PHOTO_UNREADABLE_MESSAGE);
    expect(PHOTO_UNREADABLE_MESSAGE).not.toMatch(/Réessayez/);
    expect(photoUploadErrorMessage(new Error("storage down"))).toBe(PHOTO_UPLOAD_INTERRUPTED_MESSAGE);
  });
});

describe("pastille d'Alma", () => {
  it("absente du formulaire d'annonce, tous parcours, et du tableau de bord", () => {
    expect(isAlmaPillHiddenOn("/sits/create")).toBe(true);
    expect(isAlmaPillHiddenOn("/dashboard")).toBe(true);
  });

  it("présente ailleurs", () => {
    expect(isAlmaPillHiddenOn("/sits")).toBe(false);
    expect(isAlmaPillHiddenOn("/annonces")).toBe(false);
  });
});
