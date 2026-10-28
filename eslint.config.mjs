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
    ".next-hybrid-dev/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local QA scripts, browser profiles and account data are not shipped source.
    "artifacts/**",
    ".aenural-local/**",
    // Unpacked third-party research fixture; never application source.
    "artifacts/captionx-research-fixtures/package/**",
    // Generated Chrome profiles contain third-party extensions, not project code.
    "artifacts/**/*chrome*profile*/**",
  ]),
]);

export default eslintConfig;
