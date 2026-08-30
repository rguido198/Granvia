import "server-only";

/**
 * Photos carry no extractable text — Diego's own flow treats them as visual
 * evidence attached to a ticket (§2B "Request a photo when the fault is
 * visual"), never as a diagnosis source. `null` here is correct handling,
 * not a missing feature.
 */
export async function extractText(
  bytes: Uint8Array,
  mimeType: string,
): Promise<string | null> {
  if (mimeType === "application/pdf") {
    const { extractText: extractPdfText, getDocumentProxy } =
      await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return text.trim();
  }

  if (mimeType.startsWith("text/")) {
    return Buffer.from(bytes).toString("utf-8").trim();
  }

  if (mimeType.startsWith("image/")) {
    return null;
  }

  throw new Error(`Unsupported mime type for extraction: ${mimeType}`);
}
