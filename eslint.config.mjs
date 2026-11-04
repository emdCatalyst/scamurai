import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
  ]),
  {
    rules: {
      // Zod is configured for the Content-Security-Policy in src/lib/zod.ts.
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "zod", message: "Import { z } from '@/lib/zod' instead (configured for the CSP)." }] },
      ],
    },
  },
  {
    files: ["src/lib/zod.ts"],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
