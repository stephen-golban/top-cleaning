/**
 * `node --import ./scripts/ts-resolver.mjs …` — teaches Node to resolve the
 * extensionless relative imports the TypeScript sources use. See
 * `./ts-resolve-hooks.mjs` for why that is necessary.
 */
import { register } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);
