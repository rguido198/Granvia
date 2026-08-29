import { describe, it, expect } from "vitest";
import { matchesDeclaredType } from "./file-signature";

describe("matchesDeclaredType", () => {
  it("accepts a real PDF header", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n...rest of file...");
    expect(matchesDeclaredType("application/pdf", bytes)).toBe(true);
  });

  it("rejects a non-PDF payload declared as application/pdf", () => {
    const bytes = new TextEncoder().encode("<html><body>not a pdf</body></html>");
    expect(matchesDeclaredType("application/pdf", bytes)).toBe(false);
  });

  it("accepts a real JPEG header", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(matchesDeclaredType("image/jpeg", bytes)).toBe(true);
  });

  it("rejects a PNG payload declared as image/jpeg", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(matchesDeclaredType("image/jpeg", bytes)).toBe(false);
  });

  it("accepts a real PNG header", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(matchesDeclaredType("image/png", bytes)).toBe(true);
  });

  it("rejects a JPEG payload declared as image/png", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x00, 0x00]);
    expect(matchesDeclaredType("image/png", bytes)).toBe(false);
  });

  it("accepts an ISO base media (ftyp) box declared as image/heic", () => {
    // 4-byte box size, then "ftyp", then a brand — the actual HEIC magic.
    const bytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x18,
      ...new TextEncoder().encode("ftypheic"),
    ]);
    expect(matchesDeclaredType("image/heic", bytes)).toBe(true);
  });

  it("rejects a payload with no ftyp box declared as image/heic", () => {
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(matchesDeclaredType("image/heic", bytes)).toBe(false);
  });

  it("rejects on a truncated payload shorter than the magic bytes it claims", () => {
    const bytes = new Uint8Array([0x25, 0x50]); // "%P" — too short to be "%PDF-"
    expect(matchesDeclaredType("application/pdf", bytes)).toBe(false);
  });

  it("has no magic-byte check for text/plain — allow-list + size cap cover it instead", () => {
    const bytes = new TextEncoder().encode("cualquier cosa");
    expect(matchesDeclaredType("text/plain", bytes)).toBe(true);
  });
});
