import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

// The installed eslint-config-next still ships legacy (eslintrc-shape)
// configs — `core-web-vitals.js` / `typescript.js` are plain `{ extends }`
// objects, not flat-config arrays. FlatCompat bridges them into ESLint 9's
// flat config, same as Next.js's own docs recommend.
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare Pages build output — not source, shouldn't be linted.
    ".wrangler/**",
    ".vercel/**",
  ]),
]);

export default eslintConfig;
