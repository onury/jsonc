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

- Parse JSON with **comments**.
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
> Since v3 this package is ESM-only. On Node.js 22.12 or newer, CommonJS code can still `require()` it; you get the module namespace, so pick the export you need: `const { jsonc } = require('jsonc');`

### Parse & Stringify

`parse()` strips comments before parsing. It takes the native reviver function, or an options object.

```ts
jsonc.parse('{"a":1} // one', (key, value) => (key === 'a' ? 2 : value)); // —> { a: 2 }
jsonc.parse(str, { stripComments: false }); // throws if str has comments
```

`stringify()` supports both the native `JSON.stringify()` signature and an options object. Circular references are replaced with `"[Circular]"` unless you turn it off with `handleCircular: false`; in which case it throws like the native method.

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

`read()` strips the UTF-8 BOM and comments, then parses. `write()` stringifies with a trailing newline and creates missing parent directories (unless `autoPath` is `false`).

```ts
const config = await jsonc.read('path/to/config.json');
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
| `parse(str, options?)` | `any` | `[err, any]` | Parses a JSON string; comments are stripped. `options` is a reviver function or `{ reviver?, stripComments? }`. |
| `stringify(value, options?)`<br/>`stringify(value, replacer?, space?)` | `string` | `[err, string]` | Stringifies a value. `options` is `{ replacer?, space?, handleCircular? }`; `handleCircular` defaults to `true` (the safe version always handles circular references). |
| `isJSON(str, allowComments?)` | `boolean` | `boolean` | Whether the string is JSON with an object or array structure. `allowComments` defaults to `false`. |
| `stripComments(str, whitespace?)` | `string` | `[err, string]` | Strips comments; or replaces them with whitespace when `whitespace` is `true`. |
| `uglify(str)` | `string` | `[err, string]` | Removes comments and whitespace from a JSON string. |
| `beautify(str, space?)` | `string` | `[err, string]` | Removes comments and indents a JSON string. `space` defaults to `2`. |
| `normalize(value, replacer?)` | `any` | `[err, any]` | Stringifies and parses back a value, to plain JSON data. |
| `read(filePath, options?)` | `Promise<any>` | `Promise<[err, any]>` | Reads and parses a JSON file. `options` is `{ reviver?, stripComments? }`. |
| `readSync(filePath, options?)` | `any` | `[err, any]` | Sync version of `read()`. |
| `write(filePath, data, options?)` | `Promise<true>` | `Promise<[err, true]>` | Stringifies and writes a JSON file. `options` is `{ replacer?, space?, mode?, autoPath? }`; `mode` defaults to `0o666`, `autoPath` to `true`. |
| `writeSync(filePath, data, options?)` | `true` | `[err, true]` | Sync version of `write()`. |
| `log(...args)` | `void` | `void` | Logs the arguments as JSON. |
| `logp(...args)` | `void` | `void` | Logs the arguments as indented JSON. |
| `config(cfg?)` | `void` | `void` | Sets `{ stream?, streamErr? }` for the loggers. Omitted streams reset to `process.stdout` / `process.stderr`. |

Exported types: `IParseOptions`, `IStringifyOptions`, `IReadOptions`, `IWriteOptions`, `IConfig`, `Replacer`, `Reviver`, `SafeResult<T>`.

## Tests & Quality

100% test coverage (statements, branches, functions, lines) and a **100% [Stryker](https://stryker-mutator.io) mutation score**, run across Node.js 22, 24 and 26 in CI.

## Changelog

See [**CHANGELOG.md**][changelog]. **v3 is ESM-only** and requires Node.js 22 or newer; the rest of the API is unchanged.

## Related Projects

- [**notation**](https://github.com/onury/notation) — Read, modify, and filter the contents of objects and arrays via dot/bracket notation strings or glob patterns.

## License

© 2026, Onur Yıldırım. [**MIT**][license] License.

[license]:https://github.com/onury/jsonc/blob/master/LICENSE
[changelog]:https://github.com/onury/jsonc/blob/master/CHANGELOG.md
[parse-json]:https://github.com/sindresorhus/parse-json
