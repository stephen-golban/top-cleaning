/**
 * Module-resolution shims so `node --test` can import application modules.
 *
 * `pnpm test` runs the TypeScript sources directly under Node's type stripping.
 * Two things in this codebase's import graph are invisible to Node's resolver:
 *
 *  1. the `@/…` path alias, which only `tsconfig.json` and the bundler know
 *     about (`scripts/ts-resolve-hooks.mjs` handles extensionless *relative*
 *     imports, not the alias);
 *  2. `next/navigation` and `next/link`, which next-intl imports without an
 *     extension. Next ships them as real files (`navigation.js`) rather than
 *     through an `exports` map entry Node can follow.
 *
 * Importing this module registers synchronous resolution hooks that fix both,
 * so a test can exercise the real `getPathname` / route table instead of a
 * stub. Import it *before* the module under test:
 *
 * ```ts
 * import "./node-test-setup.mts";
 * const { buildSitemap } = await import("./sitemap.ts");
 * ```
 *
 * Test-only. Nothing in `src/app` or `src/components` should import this.
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";

/** Extensions to try when resolving an aliased, extensionless import. */
const TS_EXTENSIONS = ["", ".ts", ".tsx", ".mts", "/index.ts"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    // `@/foo/bar` → `<repo>/src/foo/bar.ts`
    if (specifier.startsWith("@/")) {
      const base = new URL(`../../${specifier.slice(2)}`, import.meta.url);
      for (const extension of TS_EXTENSIONS) {
        const candidate = new URL(base.href + extension);
        if (existsSync(candidate)) return nextResolve(candidate.href, context);
      }
    }

    // `next/navigation` → `next/navigation.js`
    if (/^next\/[^./]+$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.js`, context);
      } catch {
        // fall through to the default resolution and let it report the error
      }
    }

    return nextResolve(specifier, context);
  },
});
