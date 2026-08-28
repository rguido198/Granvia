import "server-only";
import { revalidateTag } from "next/cache";

// Split out from ask-copiloto.ts so a write action only needs to import a
// revalidateTag call, not the Anthropic SDK that file also pulls in.
export const COPILOTO_CACHE_TAG = "copiloto-portfolio-data";

export function invalidateCopilotoCache() {
  revalidateTag(COPILOTO_CACHE_TAG);
}
