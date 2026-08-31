/**
 * Module-resolution hooks for running the TypeScript sources under `node --test`.
 *
 * Application code imports `./tokens`, not `./tokens.ts` — that is what the
 * bundler expects and what `tsconfig`'s `moduleResolution: "bundler"` enforces.
 * Node's ESM loader does no extension guessing, so without this hook every
 * import in a file under test fails to resolve.
 *
 * Registered by `scripts/ts-resolver.mjs`, which the `test` script `--import`s.
 */
const EXTENSIONS = [".ts", ".mts", "/index.ts"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith(".") || specifier.startsWith("/");
    if (error?.code !== "ERR_MODULE_NOT_FOUND" || !relative) throw error;

    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(specifier + extension, context);
      } catch {
        // try the next extension
      }
    }
    throw error;
  }
}
