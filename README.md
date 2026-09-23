# jsonc

<p align="center">
  <a href="https://github.com/onury/jsonc/actions/workflows/ci.yml"><img src="https://github.com/onury/jsonc/actions/workflows/ci.yml/badge.svg" alt="build" /></a>
  <a href="#tests--quality"><img src="https://img.shields.io/badge/coverage-100%25-2BB150?logo=vitest&logoColor=%23FDC72B&style=flat" alt="coverage" /></a>
  <a href="https://stryker-mutator.io/docs/"><img src="https://img.shields.io/badge/mutation-100%25-2BB150?style=flat" alt="mutation score" /></a>
  <a href="https://www.npmjs.com/package/jsonc"><img src="https://img.shields.io/npm/v/jsonc.svg?style=flat&label=&color=%23C6234B&logo=npm" alt="version" /></a>
  <a href="https://www.npmjs.com/package/jsonc"><img src="https://img.shields.io/npm/dm/jsonc.svg?style=flat&color=2BB150&label=downloads" alt="downloads" /></a>
  <a href="https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7"><img src="https://img.shields.io/badge/ESM-F7DF1E?style=flat" alt="ESM" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TS-3260C7?style=flat" alt="TS" /></a>
  <a href="https://github.com/onury/jsonc/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/jsonc.svg?style=flat&color=blue" alt="license" /></a>
</p>

> This module is **ESM** 🔆. Please [**read this**](https://gist.github.com/onury/d3f3d765d7db2e8b2d050d14315f2ac7).

Everything you need in JSON land. Parse JSON with comments, stringify objects with circular references, read and write JSON files; and do all of it safely, without try/catch blocks if you like.

```sh
npm i jsonc
```

## Features

- Parse JSON with **comments** (and optionally, **trailing commas**).
- Stringify objects with **circular** references.
- **Safely** parse / stringify without try/catch blocks.
- **Read** and auto-parse JSON files, sync or async (with promises).
- Auto-stringify and **write** JSON files, sync or async; creates missing directories.
- Strips the UTF-8 **BOM**.
- **Log** objects as JSON, without worrying about errors.
- **Uglify** / **beautify** JSON strings.
- More helpful JSON **errors** (via [parse-json][parse-json]).
- **Typed**. Written in TypeScript.

## Usage

```ts
import { jsonc } from 'jsonc';
// or the default export
import jsonc from 'jsonc';

// CommonJS (Node.js 22.12 or newer)
const jsonc = require('jsonc');
```

This is safe for JSON with comments:

```ts
jsonc.parse('// comment\n{"data": /* comment */ "value"}\n'); // —> { data: 'value' }
```

And this is safe for circular references:

```ts
const obj = { x: 1 };
obj.y = obj; // circular
jsonc.stringify(obj); // —> '{"x":1,"y":"[Circular]"}'
```

But this is seriously safe:

```ts
// safe version of every method
import { safe as jsonc } from 'jsonc';

const [err, result] = jsonc.parse('[invalid JSON}');
if (err) {
  console.log(`Failed to parse JSON: ${err.message}`);
} else {
  console.log(result);
}
```

> [!NOTE]
> Since v3 this package is ESM-only. CommonJS code can still `require()` it on Node.js 22.12 or newer (Node's `require(esm)`), and it returns `jsonc` itself as v2 did; so `const jsonc = require('jsonc')` and `const { jsonc, safe } = require('jsonc')` both work. On Node.js 22.0 – 22.11, use `import` or `await import('jsonc')`.

### Parse & Stringify

`parse()` strips comments before parsing. It takes the native reviver function, or an options object. Comments are replaced with whitespace, so the position in a parse error points into your original string.

```ts
jsonc.parse('{"a":1} // one', (key, value) => (key === 'a' ? 2 : value)); // —> { a: 2 }
jsonc.parse(str, { stripComments: false }); // throws if str has comments

// trailing commas are opt-in (as in tsconfig.json)
jsonc.parse('{ "a": [1, 2,], }', { allowTrailingCommas: true }); // —> { a: [1, 2] }

// typed result (not validated at runtime)
const config = jsonc.parse<IConfig>(str);
```

`stringify()` supports both the native `JSON.stringify()` signature and an options object. Circular references are replaced with `"[Circular]"` unless you turn it off with `handleCircular: false`; in which case it throws like the native method. Anything else the native method throws for (a `BigInt`, a throwing `toJSON()`, etc…) is thrown as well.

```ts
jsonc.stringify(obj, null, 2);
jsonc.stringify(obj, { replacer: ['a', 'b'], space: 2 });
jsonc.stringify(obj, { handleCircular: false }); // throws if obj has circular references
```

### Validate, Strip, Uglify & Beautify

```ts
jsonc.isJSON('{"x":1}');                 // —> true
jsonc.isJSON('true');                    // —> false (valid JSON but no object or array structure)
jsonc.isJSON('// c\n{"x":1}', true);     // —> true (allow comments)

jsonc.stripComments('// c\n{"x":1}');    // —> '\n{"x":1}'
jsonc.uglify('{\n  // c\n  "x": 1\n}');  // —> '{"x":1}'
jsonc.beautify('{"x":1}');               // —> '{\n  "x": 1\n}'
jsonc.normalize(new SomeClass());        // —> plain object
```

### Read & Write Files

`read()` strips the UTF-8 BOM and comments, then parses; it takes the same `allowTrailingCommas` option. `write()` stringifies the same way `stringify()` does (circular references included, unless `handleCircular` is `false`), adds a trailing newline and creates missing parent directories (unless `autoPath` is `false`).

```ts
const config = await jsonc.read<IConfig>('path/to/config.json');
await jsonc.write('path/to/out.json', config, { space: 2 });

// sync versions
const data = jsonc.readSync('path/to/config.json');
jsonc.writeSync('path/to/out.json', data);
```

With the safe versions, the returned promise never rejects:

```ts
import { safe as jsonc } from 'jsonc';

const [err, config] = await jsonc.read('path/to/config.json');
if (err) console.log('Failed to read JSON file');
```

### Logging

`log()` and `logp()` (pretty) stringify their arguments without throwing and write them to `process.stdout`. An `Error` is logged with its stack, to `process.stderr`. Use `config()` to redirect either stream.

```ts
jsonc.log({ a: 1 }, [1, 2]); // {"a":1} [1,2]
jsonc.logp({ a: 1 });
// {
//   "a": 1
// }

jsonc.config({ streamErr: fs.createWriteStream('errors.log') });
jsonc.log(new Error('this is logged to the file'));
```

## API

All methods are static; `jsonc.safe` (also the named `safe` export) holds the safe versions.

| Method | Returns | Safe version returns | Description |
| ------ | ------- | -------------------- | ----------- |
| `parse<T>(str, options?)` | `T` (default `any`) | `[err, T]` | Parses a JSON string; comments are stripped. `options` is a reviver function or [parse options](#options). |
| `stringify(value, options?)`<br/>`stringify(value, replacer?, space?)` | `string` | `[err, string]` | Stringifies a value. `options` are the [stringify options](#options). Throws for circular references only if `handleCircular` is `false`, and for anything the native method throws for (e.g. a `BigInt`). |
| `isJSON(str, allowComments?)` | `boolean` | `boolean` | Whether the string is JSON with an object or array structure. `allowComments` defaults to `false`. |
| `stripComments(str, whitespace?)` | `string` | `[err, string]` | Strips comments; or replaces them with whitespace when `whitespace` is `true`. |
| `uglify(str)` | `string` | `[err, string]` | Removes comments and whitespace from a JSON string. |
| `beautify(str, space?)` | `string` | `[err, string]` | Removes comments and indents a JSON string. `space` defaults to `2`. |
| `normalize<T>(value, replacer?)` | `T` (default `any`) | `[err, T]` | Stringifies and parses back a value, to plain JSON data. |
| `read<T>(filePath, options?)` | `Promise<T>` | `Promise<[err, T]>` | Reads and parses a JSON file; strips the UTF-8 BOM. `options` are the [parse options](#options). |
| `readSync<T>(filePath, options?)` | `T` | `[err, T]` | Sync version of `read()`. |
| `write(filePath, data, options?)` | `Promise<true>` | `Promise<[err, true]>` | Stringifies and writes a JSON file, with a trailing newline. `options` are the [write options](#options). |
| `writeSync(filePath, data, options?)` | `true` | `[err, true]` | Sync version of `write()`. |
| `log(...args)` | `void` | `void` | Logs the arguments as JSON. |
| `logp(...args)` | `void` | `void` | Logs the arguments as indented JSON. |
| `config(cfg?)` | `void` | `void` | Sets `{ stream?, streamErr? }` for the loggers. Omitted streams reset to `process.stdout` / `process.stderr`. |

### Options

| Option | Type | Default | Used by | Description |
| ------ | ---- | ------- | ------- | ----------- |
| `reviver` | `Reviver` | — | parse, read, readSync | Transforms the parsed results, as with `JSON.parse()`. |
| `stripComments` | `boolean` | `true` | parse, read, readSync | Whether to strip comments. If `false`, comments are a parse error. |
| `allowTrailingCommas` | `boolean` | `false` | parse, read, readSync | Whether to allow trailing commas in objects and arrays. Takes effect only when comments are stripped. |
| `replacer` | `Replacer` | — | stringify, write, writeSync | A replacer function, or an allow-list array of property names. |
| `space` | `string \| number` | — | stringify, write, writeSync | Indentation; a number of spaces or an indent string. |
| `handleCircular` | `boolean` | `true` | stringify, write, writeSync | Whether to replace circular references with `"[Circular]"`. If `false`, they throw. |
| `mode` | `number` | `0o666` | write, writeSync | File-system permission mode for a new file. |
| `autoPath` | `boolean` | `true` | write, writeSync | Whether to create missing parent directories. |

Exported types: `IParseOptions`, `IStringifyOptions`, `IReadOptions`, `IWriteOptions`, `IConfig`, `Replacer`, `Reviver`, `SafeResult<T>`.

## Tests & Quality

100% test coverage (statements, branches, functions, lines) and a **100% [Stryker](https://stryker-mutator.io) mutation score**, run across Node.js 22, 24 and 26 in CI.

## Changelog

See [**CHANGELOG.md**][changelog]. **v3 is ESM-only** and requires Node.js 22 or newer; it also changes a few behaviors (circular references in `write()`, `BigInt` in `stringify()`, parse error positions). The migration notes live there.

## Related Projects

- [**notation**](https://github.com/onury/notation) — Read, modify, and filter the contents of objects and arrays via dot/bracket notation strings or glob patterns.

## License

© 2026, Onur Yıldırım. [**MIT**][license] License.

[license]:https://github.com/onury/jsonc/blob/master/LICENSE
[changelog]:https://github.com/onury/jsonc/blob/master/CHANGELOG.md
[parse-json]:https://github.com/sindresorhus/parse-json
