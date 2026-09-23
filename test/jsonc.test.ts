// core modules
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// own modules
import jsoncDefault, {
  type IConfig,
  type IReadOptions,
  type IWriteOptions,
  jsonc,
  safe
} from '../src/index.js';

const withComments = `
// comments will be stripped...
{
  "some": /* special */ "property",
  "value": 1 // don't change this!!!
}
`;
const invalidJson = '[invalid JSON}';

class MyClass {
  a = 1;
  b = 'prop';
}

function circular(): any {
  const x: any = { a: 1, b: 'text' };
  x.y = x;
  return x;
}

function collector(): { stream: NodeJS.WritableStream; out: string[] } {
  const out: string[] = [];
  const stream = { write: (chunk: string) => out.push(chunk) } as unknown as NodeJS.WritableStream;
  return { stream, out };
}

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonc-test-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  jsonc.config();
});

describe('exports', () => {
  test('named, default and safe exports', async () => {
    expect(jsoncDefault).toBe(jsonc);
    expect(jsonc.safe).toBe(safe);
    const ns: Record<string, unknown> = await import('../src/index.js');
    expect(Object.keys(ns).sort()).toEqual(['default', 'jsonc', 'module.exports', 'safe']);
    // what require('jsonc') returns: jsonc itself, with the v2 self-references
    expect(ns['module.exports']).toBe(jsonc);
    expect(jsonc.jsonc).toBe(jsonc);
  });
});

describe('jsonc.parse()', () => {
  test('strips comments by default', () => {
    expect(jsonc.parse(withComments)).toEqual({ some: 'property', value: 1 });
    expect(jsonc.parse(withComments, null as any)).toEqual({ some: 'property', value: 1 });
  });

  test('throws on comments when stripComments is false', () => {
    expect(() => jsonc.parse(withComments, { stripComments: false })).toThrow();
    expect(jsonc.parse('{"a":1}', { stripComments: false })).toEqual({ a: 1 });
  });

  test('strips comments without whitespace (error positions refer to the stripped string)', () => {
    expect(() => jsonc.parse('/*c*/{')).toThrow(/position 1 /);
  });

  test('accepts a reviver function or options.reviver', () => {
    const reviver = (key: string, value: any) => (key === 'some' ? `modified ${value}` : value);
    expect(jsonc.parse(withComments, reviver).some).toBe('modified property');
    expect(jsonc.parse(withComments, { reviver }).some).toBe('modified property');
  });

  test('throws on invalid JSON', () => {
    expect(() => jsonc.parse(invalidJson)).toThrow();
  });
});

describe('jsonc.stringify()', () => {
  const o = { a: 1, b: 'text' };
  const pretty = '{\n  "a": 1,\n  "b": "text"\n}';
  const replacer = (key: string, value: any) => (key === 'b' ? `modified ${value}` : value);

  test('native signature and options object', () => {
    expect(jsonc.stringify(o)).toBe('{"a":1,"b":"text"}');
    expect(jsonc.stringify(o, null, 2)).toBe(pretty);
    expect(jsonc.stringify(o, { space: 2 })).toBe(pretty);
    expect(jsonc.stringify(o, replacer, 2)).toBe('{\n  "a": 1,\n  "b": "modified text"\n}');
    expect(jsonc.stringify(o, { replacer, space: 2 })).toBe(
      '{\n  "a": 1,\n  "b": "modified text"\n}'
    );
  });

  test('array replacer (allow-list)', () => {
    expect(jsonc.stringify(o, ['a'])).toBe('{"a":1}');
    expect(jsonc.stringify(o, ['a'], 1)).toBe('{\n "a": 1\n}');
    // an invalid replacer is ignored, as with JSON.stringify()
    expect(jsonc.stringify(o, 'x' as any, 1)).toBe('{\n "a": 1,\n "b": "text"\n}');
  });

  test('handles circular references by default', () => {
    expect(jsonc.stringify(circular())).toBe('{"a":1,"b":"text","y":"[Circular]"}');
    expect(jsonc.stringify(circular(), {})).toBe('{"a":1,"b":"text","y":"[Circular]"}');
    expect(() => jsonc.stringify(circular(), { handleCircular: false })).toThrow(TypeError);
    expect(jsonc.stringify(o, { handleCircular: false, space: 1 })).toBe(
      '{\n "a": 1,\n "b": "text"\n}'
    );
  });
});

describe('jsonc.stringify() errors', () => {
  test('throws for BigInt instead of returning a placeholder', () => {
    expect(() => jsonc.stringify(1n)).toThrow(TypeError);
    expect(() => jsonc.stringify({ a: 1n })).toThrow(/BigInt/);
    expect(() => jsonc.stringify({ a: 1n }, { handleCircular: false })).toThrow(/BigInt/);
    expect(() => jsonc.normalize({ a: 1n })).toThrow(TypeError);
  });

  test('rethrows what toJSON() throws', () => {
    const o = {
      toJSON() {
        throw new RangeError('toJSON failed');
      }
    };
    expect(() => jsonc.stringify(o)).toThrow(RangeError);
  });

  test('a string equal to the placeholder text still stringifies', () => {
    const text = '[unable to serialize, circular reference is too complex to analyze]';
    expect(jsonc.stringify(text)).toBe(JSON.stringify(text));
    expect(jsonc.stringify({ text, self: null })).toBe(JSON.stringify({ text, self: null }));
  });
});

describe('jsonc.isJSON()', () => {
  test('validates structure', () => {
    expect(jsonc.isJSON(5 as any)).toBe(false);
    expect(jsonc.isJSON({} as any)).toBe(false);
    expect(jsonc.isJSON(['{}'] as any)).toBe(false);
    expect(jsonc.isJSON('true')).toBe(false);
    expect(jsonc.isJSON('1')).toBe(false);
    expect(jsonc.isJSON('null')).toBe(false);
    expect(jsonc.isJSON('"str"')).toBe(false);
    expect(jsonc.isJSON('[null]')).toBe(true);
    expect(jsonc.isJSON('{}')).toBe(true);
    expect(jsonc.isJSON(invalidJson)).toBe(false);
    expect(jsonc.isJSON('// comments\n{"x":/*test*/1}')).toBe(false);
    expect(jsonc.isJSON('// comments\n{"x":/*test*/1}', true)).toBe(true);
  });
});

describe('jsonc.stripComments()', () => {
  test('strips or replaces with whitespace', () => {
    expect(jsonc.stripComments('// comments\n{"x":/*test*/1}')).toBe('\n{"x":1}');
    expect(jsonc.stripComments('// comments\n{"x":/*test*/1}', true)).toBe(
      '           \n{"x":        1}'
    );
  });
});

describe('jsonc.uglify() / jsonc.beautify()', () => {
  const with2spaces = '{\n  "some": "property",\n  "value": 1\n}';

  test('uglify', () => {
    expect(jsonc.uglify(withComments)).toBe('{"some":"property","value":1}');
  });

  test('beautify', () => {
    const ugly = jsonc.uglify(withComments);
    expect(jsonc.beautify(ugly)).toBe(with2spaces);
    expect(jsonc.beautify(withComments)).toBe(with2spaces);
    expect(jsonc.beautify(ugly, 0)).toBe(with2spaces);
    expect(jsonc.beautify(ugly, 4)).toBe('{\n    "some": "property",\n    "value": 1\n}');
    expect(jsonc.beautify(ugly, '\t')).toBe('{\n\t"some": "property",\n\t"value": 1\n}');
  });
});

describe('jsonc.normalize()', () => {
  test('converts to plain data', () => {
    const mc = new MyClass();
    const normalized = jsonc.normalize(mc);
    expect(mc.constructor.name).toBe('MyClass');
    expect(normalized.constructor.name).toBe('Object');
    expect(normalized).toEqual({ a: 1, b: 'prop' });
    expect(jsonc.normalize(circular())).toEqual({ a: 1, b: 'text', y: '[Circular]' });
  });

  test('with replacer', () => {
    const n = jsonc.normalize(new MyClass(), (key, value) => (key === 'b' ? `${value}!` : value));
    expect(n).toEqual({ a: 1, b: 'prop!' });
  });
});

describe('file I/O', () => {
  const data = { test: 'file', x: 1 };
  const xTo5 = (key: string, value: any) => (key === 'x' ? 5 : value);

  test('write() writes packed JSON with a trailing newline, creating directories', async () => {
    const file = path.join(tmpDir, 'a', 'b', 'test.json');
    await expect(jsonc.write(file, data)).resolves.toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe('{"test":"file","x":1}\n');
  });

  test('write() options', async () => {
    const file = path.join(tmpDir, 'test.json');
    const opts: IWriteOptions = { replacer: xTo5, space: 2, mode: 0o600 };
    await jsonc.write(file, data, opts);
    expect(fs.readFileSync(file, 'utf8')).toBe('{\n  "test": "file",\n  "x": 5\n}\n');
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    await jsonc.write(file, data, { replacer: ['x'] });
    expect(fs.readFileSync(file, 'utf8')).toBe('{"x":1}\n');
  });

  test('write() / writeSync() handle circular references unless handleCircular is false', async () => {
    const expected = '{"a":1,"b":"text","y":"[Circular]"}\n';
    const file = path.join(tmpDir, 'circular.json');
    await expect(jsonc.write(file, circular())).resolves.toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe(expected);
    await expect(jsonc.write(file, circular(), { handleCircular: false })).rejects.toThrow(
      TypeError
    );
    const fileSync = path.join(tmpDir, 'circular-sync.json');
    expect(jsonc.writeSync(fileSync, circular(), { space: 0 })).toBe(true);
    expect(fs.readFileSync(fileSync, 'utf8')).toBe(expected);
    expect(() => jsonc.writeSync(fileSync, circular(), { handleCircular: false })).toThrow(
      TypeError
    );
  });

  test('write() rejects when autoPath is false and the directory is missing', async () => {
    const file = path.join(tmpDir, 'missing', 'test.json');
    await expect(jsonc.write(file, data, { autoPath: false })).rejects.toThrow(/ENOENT/);
    await expect(jsonc.write(path.join(tmpDir, 'x.json'), data, { autoPath: false })).resolves.toBe(
      true
    );
  });

  test('writeSync()', () => {
    const file = path.join(tmpDir, 'a', 'test.json');
    expect(jsonc.writeSync(file, data)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe('{"test":"file","x":1}\n');
    const file2 = path.join(tmpDir, 'test2.json');
    jsonc.writeSync(file2, data, { replacer: xTo5, space: 1, mode: 0o600 });
    expect(fs.readFileSync(file2, 'utf8')).toBe('{\n "test": "file",\n "x": 5\n}\n');
    expect(fs.statSync(file2).mode & 0o777).toBe(0o600);
    expect(() =>
      jsonc.writeSync(path.join(tmpDir, 'missing', 'x.json'), data, { autoPath: false })
    ).toThrow(/ENOENT/);
  });

  test('read() / readSync() strip BOM and comments', async () => {
    const file = path.join(tmpDir, 'test.json');
    const bom = String.fromCharCode(0xfeff);
    fs.writeFileSync(file, bom + withComments);
    const expected = { some: 'property', value: 1 };
    expect(await jsonc.read(file)).toEqual(expected);
    expect(jsonc.readSync(file)).toEqual(expected);
    // a BOM-less file keeps its first character
    fs.writeFileSync(file, '{"a":1}');
    expect(await jsonc.read(file)).toEqual({ a: 1 });
    expect(jsonc.readSync(file)).toEqual({ a: 1 });
  });

  test('read() / readSync() options', async () => {
    const file = path.join(tmpDir, 'test.json');
    fs.writeFileSync(file, JSON.stringify(data));
    const opts: IReadOptions = { stripComments: false, reviver: xTo5 };
    expect(await jsonc.read(file, opts)).toEqual({ test: 'file', x: 5 });
    expect(jsonc.readSync(file, opts)).toEqual({ test: 'file', x: 5 });

    fs.writeFileSync(file, withComments);
    await expect(jsonc.read(file, { stripComments: false })).rejects.toThrow(file);
    expect(() => jsonc.readSync(file, { stripComments: false })).toThrow(file);
    expect(() => jsonc.readSync(path.join(tmpDir, 'none.json'))).toThrow(/ENOENT/);
  });
});

describe('jsonc.config() / log() / logp()', () => {
  test('logs objects, arrays and primitives', () => {
    const { stream, out } = collector();
    jsonc.config({ stream });
    jsonc.log({ test: true });
    jsonc.log([1, 2, 3], 'str', 5);
    jsonc.log(true, null, undefined, Symbol('s'), 1n);
    jsonc.log(circular());
    jsonc.log(() => 1);
    jsonc.logp({ test: true });
    jsonc.logp([1, 2]);
    jsonc.logp(true);
    expect(out).toEqual([
      '{"test":true}\n',
      '[1,2,3] str 5\n',
      'true null undefined Symbol(s) 1\n',
      '{"a":1,"b":"text","y":"[Circular]"}\n',
      '\n',
      '{\n  "test": true\n}\n',
      '[\n  1,\n  2\n]\n',
      'true\n'
    ]);
  });

  test('logs errors to the error stream', () => {
    const std = collector();
    const err = collector();
    jsonc.config({ stream: std.stream, streamErr: err.stream });
    const e = new Error('logged error');
    jsonc.log(e);
    jsonc.logp('x', e);
    const noStack = new Error('no stack');
    noStack.stack = '';
    jsonc.log(noStack);
    const bare = new Error('');
    bare.stack = '';
    jsonc.log(bare);
    expect(std.out).toEqual([]);
    expect(err.out).toEqual([`${e.stack}\n`, `x ${e.stack}\n`, 'no stack\n', 'Error\n']);
  });

  test('defaults to process.stdout / process.stderr', () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const errOut = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const { stream } = collector();
      jsonc.config({ stream });
      jsonc.config(null);
      jsonc.log(1);
      jsonc.log(new Error('e'));
      const partial: IConfig = { streamErr: collector().stream };
      jsonc.config(partial);
      jsonc.log(2);
      expect(out.mock.calls.map((c) => c[0])).toEqual(['1\n', '2\n']);
      expect(errOut).toHaveBeenCalledTimes(1);
      expect(String(errOut.mock.calls[0][0])).toMatch(/^Error: e\n/);
    } finally {
      out.mockRestore();
      errOut.mockRestore();
    }
  });
});

describe('jsonc.safe', () => {
  test('parse()', () => {
    expect(safe.parse(withComments)).toEqual([null, { some: 'property', value: 1 }]);
    const reviver = (key: string, value: any) => (key === 'value' ? 2 : value);
    expect(safe.parse(withComments, reviver)).toEqual([null, { some: 'property', value: 2 }]);
    const [err, result] = safe.parse(invalidJson);
    expect(err).toBeInstanceOf(Error);
    expect(result).toBeUndefined();
  });

  test('stringify()', () => {
    const o = { a: 1, b: 'text' };
    expect(safe.stringify(o)).toEqual([null, '{"a":1,"b":"text"}']);
    expect(safe.stringify(o, null, 2)).toEqual([null, '{\n  "a": 1,\n  "b": "text"\n}']);
    expect(safe.stringify(o, ['b'], 1)).toEqual([null, '{\n "b": "text"\n}']);
    expect(safe.stringify(o, { space: 1 })).toEqual([null, '{\n "a": 1,\n "b": "text"\n}']);
    const expected = '{"a":1,"b":"text","y":"[Circular]"}';
    expect(safe.stringify(circular())).toEqual([null, expected]);
    const [cErr, cStr] = safe.stringify(circular(), { handleCircular: false });
    expect(cErr).toBeInstanceOf(TypeError);
    expect(cStr).toBeUndefined();

    const throwing = {
      get error(): any {
        throw new Error('getter');
      }
    };
    const [bErr] = safe.stringify({ a: 1n });
    expect(bErr).toBeInstanceOf(TypeError);
    const [err, str] = safe.stringify(throwing);
    expect(err).toBeInstanceOf(Error);
    expect(str).toBeUndefined();
  });

  test('isJSON()', () => {
    expect(safe.isJSON('{}')).toBe(true);
    expect(safe.isJSON('true')).toBe(false);
    expect(safe.isJSON('// c\n{}')).toBe(false);
    expect(safe.isJSON('// c\n{}', true)).toBe(true);
  });

  test('stripComments()', () => {
    expect(safe.stripComments('// c\n{"x":/*t*/1}')).toEqual([null, '\n{"x":1}']);
    expect(safe.stripComments('// c\n{"x":/*t*/1}', true)).toEqual([null, '    \n{"x":     1}']);
    expect(safe.stripComments(5 as any)[0]).toBeInstanceOf(TypeError);
  });

  test('uglify() / beautify()', () => {
    expect(safe.uglify(withComments)).toEqual([null, '{"some":"property","value":1}']);
    expect(safe.uglify(invalidJson)[0]).toBeInstanceOf(Error);
    const ugly = '{"a":1}';
    expect(safe.beautify(ugly)).toEqual([null, '{\n  "a": 1\n}']);
    expect(safe.beautify(ugly, 0)).toEqual([null, '{\n  "a": 1\n}']);
    expect(safe.beautify(ugly, 4)).toEqual([null, '{\n    "a": 1\n}']);
    expect(safe.beautify(invalidJson)[0]).toBeInstanceOf(Error);
  });

  test('normalize()', () => {
    const [err, normalized] = safe.normalize(new MyClass());
    expect(err).toBeNull();
    expect(normalized.constructor.name).toBe('Object');
    expect(safe.normalize(new MyClass(), ['a'])).toEqual([null, { a: 1 }]);
    expect(safe.normalize(undefined)[0]).toBeInstanceOf(TypeError);
  });

  test('read() / write()', async () => {
    const file = path.join(tmpDir, 'a', 'test.json');
    expect(await safe.write(file, { x: 1 }, { space: 1 })).toEqual([null, true]);
    expect(await safe.read(file)).toEqual([null, { x: 1 }]);
    expect(await safe.read(file, { reviver: () => 7 })).toEqual([null, 7]);

    const missing = path.join(tmpDir, 'missing', 'x.json');
    const [wErr, wRes] = await safe.write(missing, {}, { autoPath: false });
    expect(wErr).toBeInstanceOf(Error);
    expect(wRes).toBeUndefined();
    const [rErr, rRes] = await safe.read(missing);
    expect(rErr).toBeInstanceOf(Error);
    expect(rRes).toBeUndefined();
  });

  test('readSync() / writeSync()', () => {
    const file = path.join(tmpDir, 'a', 'test.json');
    expect(safe.writeSync(file, { x: 1 }, { space: 1 })).toEqual([null, true]);
    expect(fs.readFileSync(file, 'utf8')).toBe('{\n "x": 1\n}\n');
    expect(safe.readSync(file)).toEqual([null, { x: 1 }]);
    expect(safe.readSync(file, { reviver: () => 7 })).toEqual([null, 7]);

    const missing = path.join(tmpDir, 'missing', 'x.json');
    expect(safe.writeSync(missing, {}, { autoPath: false })[0]).toBeInstanceOf(Error);
    expect(safe.readSync(missing)[0]).toBeInstanceOf(Error);
  });

  test('config() / log() / logp()', () => {
    const { stream, out } = collector();
    safe.config({ stream, streamErr: stream });
    safe.log({ a: 1 }, 'x');
    safe.logp({ a: 1 });
    safe.log(new Error('e'));
    expect(out[0]).toBe('{"a":1} x\n');
    expect(out[1]).toBe('{\n  "a": 1\n}\n');
    expect(out[2]).toMatch(/^Error: e\n/);
  });
});
