import { describe, it, expect } from "vitest";
import {
  buildProfileLightboxItems,
  thumbnailLightboxIndex,
  isRealAvatarUrl,
  wrapIndex,
} from "@/lib/profileLightbox";

const AVATAR = "https://storage.example/avatars/melanie.jpg";
const galleryOf = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    photo_url: `https://storage.example/gallery/photo-${i}.jpg`,
    caption: i === 0 ? "Mon salon" : null,
    source: i === 2 ? "guardiens" : "externe",
  }));

describe("buildProfileLightboxItems", () => {
  it("place la photo de profil en première position, la galerie derrière", () => {
    const items = buildProfileLightboxItems(AVATAR, galleryOf(19));
    expect(items).toHaveLength(20);
    expect(items[0]).toMatchObject({ photo_url: AVATAR, kind: "avatar" });
    expect(items[1]).toMatchObject({ photo_url: galleryOf(19)[0].photo_url, kind: "gallery" });
    expect(items[19].photo_url).toBe(galleryOf(19)[18].photo_url);
  });

  it("conserve captions et source des photos de galerie", () => {
    const items = buildProfileLightboxItems(AVATAR, galleryOf(3));
    expect(items[1].caption).toBe("Mon salon");
    expect(items[3].source).toBe("guardiens");
  });

  it("sans photo de profil, le jeu est la galerie seule", () => {
    const items = buildProfileLightboxItems(null, galleryOf(4));
    expect(items).toHaveLength(4);
    expect(items.every((it) => it.kind === "gallery")).toBe(true);
  });

  it("sans galerie, le jeu est l'avatar seul (cas visiteur déconnecté)", () => {
    const items = buildProfileLightboxItems(AVATAR, []);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("avatar");
  });

  it("le placeholder ne compte pas comme photo de profil", () => {
    const items = buildProfileLightboxItems("https://x/placeholder.svg", galleryOf(2));
    expect(items).toHaveLength(2);
    expect(items.every((it) => it.kind === "gallery")).toBe(true);
  });
});

describe("thumbnailLightboxIndex", () => {
  it("avec avatar, la vignette k ouvre sur l'index k + 1", () => {
    const items = buildProfileLightboxItems(AVATAR, galleryOf(10));
    for (const k of [0, 1, 5, 9]) {
      const idx = thumbnailLightboxIndex(k, true);
      expect(items[idx].kind).toBe("gallery");
      expect(items[idx].photo_url).toBe(galleryOf(10)[k].photo_url);
    }
  });

  it("sans avatar, la vignette k ouvre sur l'index k", () => {
    const items = buildProfileLightboxItems(null, galleryOf(6));
    for (const k of [0, 3, 5]) {
      const idx = thumbnailLightboxIndex(k, false);
      expect(idx).toBe(k);
      expect(items[idx].photo_url).toBe(galleryOf(6)[k].photo_url);
    }
  });

  it("l'ouverture depuis l'avatar positionne l'index 0 sur la photo de profil", () => {
    const items = buildProfileLightboxItems(AVATAR, galleryOf(7));
    const idx = 0; // onOpenAvatarLightbox => setLightboxIdx(0)
    expect(items[idx].kind).toBe("avatar");
    expect(items[idx].photo_url).toBe(AVATAR);
  });
});

describe("isRealAvatarUrl", () => {
  it("rejette null, undefined, vide et placeholder", () => {
    expect(isRealAvatarUrl(null)).toBe(false);
    expect(isRealAvatarUrl(undefined)).toBe(false);
    expect(isRealAvatarUrl("")).toBe(false);
    expect(isRealAvatarUrl("/images/placeholder.svg")).toBe(false);
  });

  it("accepte une vraie URL", () => {
    expect(isRealAvatarUrl(AVATAR)).toBe(true);
  });
});

describe("wrapIndex", () => {
  it("boucle aux deux extrémités", () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(2, 5)).toBe(2);
  });

  it("reste à 0 sur un jeu vide ou unitaire", () => {
    expect(wrapIndex(3, 0)).toBe(0);
    expect(wrapIndex(7, 1)).toBe(0);
  });
});
