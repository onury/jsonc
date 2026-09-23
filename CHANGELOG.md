# jsonc - Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org).

## Unreleased (3.0.0)

### Changed

- **Breaking:** ESM-only!.. The package is now `"type": "module"` with an `exports` map; the CommonJS `index.js` entry is removed. On Node.js 22.12 or newer, CommonJS code can still `require('jsonc')`; it gets the module namespace, so use `const { jsonc } = require('jsonc')`.
- **Breaking:** Requires Node.js 22 or newer (was 8).
- `jsonc`, `safe` (also `jsoncSafe`) and all option/type definitions are now named exports, with `jsonc` as the default export. Previously the typings only declared `jsonc`, so `import { safe } from 'jsonc'` did not type-check.
- `jsonc.config()` argument is now optional; omitted streams reset to `process.stdout` / `process.stderr`.
- Updated `parse-json` to v8, `strip-json-comments` to v5, `fast-safe-stringify` and `graceful-fs` to their latest versions. Parse errors now come from `parse-json` v8 (`JSONError` with a code frame).

### Fixed

- Fixed an issue where `log()` / `logp()` would print an empty string for `undefined` and would throw for a `Symbol` argument. Primitives are now logged via `String()`.
- Fixed the `Replacer` type, which only allowed a function; it now also accepts an allow-list array of property names (as the runtime always did).
- Fixed the `IConfig` stream types (`NodeJS.WriteStream`, i.e. a TTY stream) which rejected file streams such as `fs.createWriteStream()`. They are now `NodeJS.WritableStream`.
- Fixed broken examples in the API docs (safe `read()` / `write()` examples had syntax errors; `stringify()` docs claimed it throws on circular references by default).

### Removed

- Removed the `mkdirp` and `strip-bom` dependencies; replaced by native recursive `mkdir` and a one-line BOM check. Removed the hand-rolled promisify helper in favor of `node:util`.

### Tooling

- TypeScript build (`tsc`) to `lib/` with `tsconfig-oy`; Biome (`biome-config-oy`) replaces TSLint.
- Vitest replaces Jest; **100% coverage** on all four metrics plus **Stryker mutation testing at 100%**.
- GitHub Actions CI (Node.js 22, 24, 26 + a mutation job) replaces Travis CI and Coveralls.
- Removed the Docma docs build; the README is the documentation now.

## 2.0.0 (2019-06-17)

### Changed

- Requires Node.js v8 or newer.
- Updated dependencies.

## 1.1.0 (2018-11-22)

### Fixed

- Fixed an issue where the TypeScript compiler would complain about the `'declare' modifier`.

### Changed

- Improved typings for safe methods.
- Updated core dependencies.

## 1.0.0 (2018-10-18)

- Initial release.
