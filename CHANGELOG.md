# jsonc - Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](http://semver.org).

## [3.0.0] - 2026-09-24

> **Breaking release!..** ESM-only, Node.js 22+, and a few behavior changes; see **Changed**. The method names and signatures are the same as v2.

### Added

- **`allowTrailingCommas`** option for `parse()`, `read()`, `readSync()` and their safe versions. Opt-in (default `false`); allows trailing commas in objects and arrays, as in JSONC files such as `tsconfig.json`. Takes effect only when comments are stripped.
- **Generic return types** for `parse<T>()`, `read<T>()`, `readSync<T>()` and `normalize<T>()` (default `any`); the safe versions return `SafeResult<T>`. The type is not validated at runtime.
- `handleCircular` option for `write()` / `writeSync()` (default `true`).
- Named exports: `jsonc`, `safe` and all option types (`IParseOptions`, `IStringifyOptions`, `IReadOptions`, `IWriteOptions`, `IConfig`, `Replacer`, `Reviver`, `SafeResult`); `jsonc` is also the default export. In v2, the typings only declared `jsonc`, so `import { safe } from 'jsonc'` did not type-check.

### Changed

- **Breaking:** ESM-only. The package is now `"type": "module"` with an `exports` map; the CommonJS `index.js` entry is removed. On Node.js 22.12 or newer, `require('jsonc')` still works (Node's `require(esm)`) and returns `jsonc` itself as in v2; so `const jsonc = require('jsonc')` and `const { jsonc, safe } = require('jsonc')` both work. On 22.0 – 22.11, use `import`.
- **Breaking:** Requires Node.js 22 or newer (was 8).
- **Breaking:** `write()` / `writeSync()` now handle circular references like `stringify()` does (written as `"[Circular]"`); they used to throw. Pass `handleCircular: false` for the old behavior.
- **Breaking:** `stringify()` (and `normalize()`) now throw for a `BigInt` and rethrow any other serialization error (e.g. from a `toJSON()`), as the native method does. They used to return the string `"[unable to serialize, circular reference is too complex to analyze]"`.
- **Breaking:** `safe.stringify()` now honors `handleCircular: false` and returns `[TypeError, undefined]` for a circular value; it used to ignore the option.
- `parse()` now replaces comments with whitespace instead of removing them, so the position, line and column in a parse error point into the original string (`read()` already did this). The parsed result is the same.
- `write()` / `writeSync()` return type is narrowed from `boolean` to `true`.
- `config()` argument is now optional; omitted streams reset to `process.stdout` / `process.stderr`.
- Updated `parse-json` to v8 and `strip-json-comments` to v5. Parse errors are `parse-json` v8's `JSONError` (with a code frame).

### Fixed

- Fixed an issue where `log()` / `logp()` would print an empty string for `undefined` and would throw for a `Symbol` argument.
- Fixed the `Replacer` type, which only allowed a function; it now also accepts an allow-list array of property names (as the runtime always did).
- Fixed the `IConfig` stream types (`NodeJS.WriteStream`, i.e. a TTY stream), which rejected file streams such as `fs.createWriteStream()`. They are now `NodeJS.WritableStream`.
- Fixed broken examples in the API docs (safe `read()` / `write()` examples had syntax errors; `stringify()` docs claimed it throws on circular references by default).

### Removed

- Removed the `graceful-fs`, `mkdirp` and `strip-bom` dependencies; file I/O uses `node:fs` and `node:fs/promises`, with native recursive `mkdir`. Runtime dependencies are now `fast-safe-stringify`, `parse-json` and `strip-json-comments`.
- Removed the Docma docs build; the README is the documentation now.

### Tooling

- TypeScript build (`tsc`) to `lib/` with `tsconfig-oy`; Biome (`biome-config-oy`) replaces TSLint.
- Vitest replaces Jest; **100% coverage** on all four metrics plus **Stryker mutation testing at 100%**.
- GitHub Actions CI (Node.js 22, 24, 26 + a mutation job) replaces Travis CI and Coveralls.

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

[3.0.0]:https://github.com/onury/jsonc/compare/v2.0.0...v3.0.0
