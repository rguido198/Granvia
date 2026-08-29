/**
 * First bytes of the file must actually match the declared MIME type — a
 * caller can set `kind`/Content-Type to anything; this catches a payload
 * that lies about what it is before it's stored or handed to extraction.
 * text/plain has no reliable magic bytes, so it's covered by the MIME
 * allow-list and size cap alone (see MAX_FILE_BYTES in the ingest route).
 */
export function matchesDeclaredType(mimeType: string, bytes: Uint8Array): boolean {
  switch (mimeType) {
    case "application/pdf":
      return (
        bytes.length >= 5 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2d
      ); // "%PDF-"
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case "image/heic":
      // ISO base media file box: 4-byte size, then "ftyp" — true for every
      // HEIC/HEIF variant (heic, heix, mif1, msf1, ...), not just one brand.
      return bytes.length >= 8 && new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
    default:
      return true;
  }
}
