// Node globals the Nuxt server runtime exposes but `@types/node` is not installed for this
// workspace. Keep this minimal and server-only in spirit; do not reach for `process` in
// browser code paths.
declare const process: {
  env: Record<string, string | undefined>
}
