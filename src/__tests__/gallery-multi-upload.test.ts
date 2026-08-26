import { describe, it, expect, vi } from "vitest";
import { uploadGalleryBatch, buildGalleryPath, GALLERY_MAX_PHOTOS } from "@/lib/galleryBatchUpload";
import { photoDateFromFilename } from "@/lib/galleryPhotoDate";

const makeFile = (name: string) => new File(["x"], name, { type: "image/jpeg" });

const baseDeps = (overrides: Partial<any> = {}) => {
  const inserted: any[] = [];
  const paths: string[] = [];
  let n = 0;
  return {
    inserted,
    paths,
    deps: {
      compress: async (f: File) => f,
      upload: async (path: string) => { paths.push(path); },
      publicUrl: (path: string) => `https://cdn.test/${path}`,
      inferDate: async () => null,
      randomSuffix: () => `s${n++}`,
      insertRow: async (row: any) => { inserted.push(row); return { id: `row-${inserted.length}`, ...row }; },
      ...overrides,
    } as any,
  };
};

describe("dépôt multiple dans la galerie gardien", () => {
  it("crée autant de lignes que de fichiers sélectionnés", async () => {
    const { inserted, deps } = baseDeps();
    const files = ["a.jpg", "b.jpg", "c.jpg"].map(makeFile);
    const results = await uploadGalleryBatch("user-1", files, 0, deps);
    expect(inserted).toHaveLength(3);
    expect(results.every(r => r.status === "success")).toBe(true);
  });

  it("un échec au milieu du lot n'empêche pas les autres, et le fichier est nommé", async () => {
    const { inserted, deps } = baseDeps({
      upload: async (path: string, f: File) => {
        if (f.name === "b.jpg") throw new Error("boom");
      },
    });
    const files = ["a.jpg", "b.jpg", "c.jpg"].map(makeFile);
    const results = await uploadGalleryBatch("user-1", files, 0, deps);
    expect(inserted).toHaveLength(2);
    const failed = results.filter(r => r.status === "error");
    expect(failed).toHaveLength(1);
    expect(failed[0].fileName).toBe("b.jpg");
    expect(results.filter(r => r.status === "success")).toHaveLength(2);
  });

  it("deux fichiers déposés dans la même milliseconde produisent deux chemins distincts", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const { paths, deps } = baseDeps();
    await uploadGalleryBatch("user-1", [makeFile("a.jpg"), makeFile("a.jpg")], 0, deps);
    expect(paths).toHaveLength(2);
    expect(paths[0]).not.toBe(paths[1]);
    vi.restoreAllMocks();
  });

  it("buildGalleryPath conserve l'extension et le discriminant", () => {
    const p = buildGalleryPath("u1", "photo.PNG", 4, "abc123");
    expect(p).toMatch(/^u1\/\d+-4-abc123\.png$/);
  });

  it("respecte le plafond de 50 sur un lot qui le dépasse, sans échec global", async () => {
    const { inserted, deps } = baseDeps();
    const files = Array.from({ length: 10 }, (_, i) => makeFile(`f${i}.jpg`));
    const results = await uploadGalleryBatch("user-1", files, GALLERY_MAX_PHOTOS - 5, deps);
    expect(inserted).toHaveLength(5);
    expect(results.filter(r => r.status === "success")).toHaveLength(5);
    expect(results.filter(r => r.status === "skipped_limit")).toHaveLength(5);
    expect(results.filter(r => r.status === "error")).toHaveLength(0);
  });

  it("la date déduite est transmise à l'insertion, jamais la date du jour", async () => {
    const { inserted, deps } = baseDeps({ inferDate: async (f: File) => photoDateFromFilename(f.name) });
    await uploadGalleryBatch("u1", [makeFile("IMG_20231126.jpg"), makeFile("vacances.jpg")], 0, deps);
    expect(inserted[0].photo_date).toBe("2023-11-26");
    expect(inserted[1].photo_date).toBeNull();
  });
});

describe("extraction de date depuis le nom de fichier", () => {
  it("couvre les quatre motifs cités", () => {
    expect(photoDateFromFilename("WhatsApp Image 2023-11-26 at 12.51.08.jpeg")).toBe("2023-11-26");
    expect(photoDateFromFilename("IMG_20231126.jpg")).toBe("2023-11-26");
    expect(photoDateFromFilename("PXL_20231126_101112345.jpg")).toBe("2023-11-26");
    expect(photoDateFromFilename("Screenshot 2023-11-26 at 09.12.33.png")).toBe("2023-11-26");
  });

  it("renvoie null sur un nom sans date", () => {
    expect(photoDateFromFilename("photo de Luna.jpg")).toBeNull();
    expect(photoDateFromFilename("")).toBeNull();
    expect(photoDateFromFilename(undefined)).toBeNull();
  });

  it("rejette une date implausible", () => {
    expect(photoDateFromFilename("IMG_20231345.jpg")).toBeNull();
  });
});
