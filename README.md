# jsonc

[![build-status](https://img.shields.io/travis/onury/jsonc.svg?branch=master)](https://travis-ci.org/onury/jsonc)
[![npm](http://img.shields.io/npm/v/jsonc.svg)](https://www.npmjs.com/package/jsonc)
[![release](https://img.shields.io/github/release/onury/jsonc.svg)](https://github.com/onury/jsonc)
[![dependencies](https://david-dm.org/onury/jsonc.svg)](https://david-dm.org/onury/jsonc)
[![license](http://img.shields.io/npm/l/jsonc.svg)](https://github.com/onury/jsonc/blob/master/LICENSE)
[![maintained](https://img.shields.io/maintenance/yes/2018.svg)](https://github.com/onury/jsonc/graphs/punch-card)  

> © 2018, Onur Yıldırım ([@onury](https://github.com/onury)). MIT License.

Everything you need in JSON land.

`npm i jsonc`

## Features

- Parse JSON with comments.
- Stringify objects with circular references.
- Safely parse / stringify without try/catch blocks.
- Read and auto-parse JSON files gracefully, sync or async (with promises).
- Auto-stringify and write JSON files gracefully, sync or async (with promises).
- Strips UTF-8 BOM.
- Log objects as JSON (without worrying about errors).
- Uglify/beautify JSON strings.
- More helpful JSON errors.
- Friendly API.
- TypeScript support.

## Usage

See the concise [API reference][docs-api].

```js
const jsonc = require('jsonc');
// or
import { jsonc } from 'jsonc';
```

This is safe for JSON with comments:
```js
jsonc.parse('// comment\n{"data": /* comment */ "value"}\n'); // » { data: 'value' }
```

And this is safe for circular references:
```js
const obj = { x: 1 };
obj.y = obj; // circular
jsonc.stringify(obj); // » { x: 1, y: '[Circular]' }
```

But this is seriously safe:
```js
// safe version of every method
const jsonc = require('jsonc').safe;
// or
import { safe as jsonc } from 'jsonc';

const [err, result] = jsonc.parse('[invalid JSON}');
if (err) {
    console.log(`Failed to parse JSON: ${err.message}`);
} else {
    console.log(result);
}
```

## Documentation

See the concise [API reference][docs-api].

## Change Log

- **v1.0.0** (2018-10-10)
    + Initial release.


## License
MIT.


[docs-api]:https://onury.io/jsonc/api
[strip-json-comments]:https://github.com/sindresorhus/strip-json-comments
[json-stringify-safe]:https://github.com/isaacs/json-stringify-safe
[parse-json]:https://github.com/sindresorhus/parse-json
[fs-extra]:https://www.npmjs.com/package/fs-extra
