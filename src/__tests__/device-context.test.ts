import { describe, it, expect } from "vitest";
import { parseDeviceContext } from "@/lib/deviceContext";

describe("parseDeviceContext", () => {
  it("identifie Android mobile et sa version majeure", () => {
    const r = parseDeviceContext(
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
      { width: 412, height: 915 },
    );
    expect(r.os).toBe("android");
    expect(r.device_type).toBe("mobile");
    expect(r.os_version_major).toBe(14);
    expect(r.viewport_w).toBe(412);
  });

  it("identifie iPhone", () => {
    const r = parseDeviceContext(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      { width: 390, height: 844 },
    );
    expect(r.os).toBe("ios");
    expect(r.device_type).toBe("mobile");
    expect(r.os_version_major).toBe(17);
  });

  it("classe un iPad en mode bureau comme tablette iOS", () => {
    const r = parseDeviceContext(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      { width: 1024, height: 1366, maxTouchPoints: 5 },
    );
    expect(r.os).toBe("ios");
    expect(r.device_type).toBe("tablet");
  });

  it("identifie un poste Windows", () => {
    const r = parseDeviceContext(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      { width: 1440, height: 900 },
    );
    expect(r.os).toBe("windows");
    expect(r.device_type).toBe("desktop");
  });

  it("ne renvoie jamais la chaîne brute", () => {
    const ua = "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/126.0 Mobile";
    const r = parseDeviceContext(ua, { width: 412, height: 915 });
    expect(JSON.stringify(r)).not.toContain("Mozilla");
    expect(Object.keys(r).sort()).toEqual(
      ["device_type", "os", "os_version_major", "viewport_h", "viewport_w"],
    );
  });
});
