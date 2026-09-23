// core modules
import path from 'node:path';

// dep modules
import fs from 'graceful-fs';
import parseJson from 'parse-json';
import stripJsonComments from 'strip-json-comments';

// own modules
import {
  fastSafeStringify,
  getLogger,
  getStringifyOptions,
  isObject,
  mkdirAsync,
  readFileAsync,
  stripBOM,
  writeFileAsync
} from './helper.js';
import type { jsoncSafe } from './jsonc.safe.js';
import type {
  IConfig,
  IParseOptions,
  IReadOptions,
  IStringifyOptions,
  IWriteOptions,
  Replacer,
  Reviver
} from './types.js';

interface ILoggers {
  logger: (...args: any[]) => void;
  prettyLogger: (...args: any[]) => void;
}

function createLoggers(cfg?: IConfig | null): ILoggers {
  const conf: Required<IConfig> = {
    stream: process.stdout,
    streamErr: process.stderr,
    ...cfg
  };
  return {
    logger: getLogger(conf, false),
    prettyLogger: getLogger(conf, true)
  };
}

function readContent(data: string, filePath: string, options?: IReadOptions): any {
  let str = stripBOM(data);
  if (options?.stripComments !== false) str = stripJsonComments(str);
  return parseJson(str, options?.reviver, filePath);
}

function writeContent(data: any, options: IWriteOptions): string {
  return `${JSON.stringify(data, options.replacer as any, options.space)}\n`;
}

/**
 * JSON utility class that can handle comments and circular references; with other extra
 * functionality such as reading and writing JSON files. All methods are static.
 *
 * @example
 * ```ts
 * import { jsonc } from 'jsonc';
 *
 * const result = jsonc.parse('// comments\n{ "key": "value" }');
 * console.log(result); // { key: 'value' }
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: the static-class shape is the published API since v1.
class jsonc {
  /**
   * Safe versions of the `jsonc` methods. These don't throw; each returns an `[err, result]` tuple
   * instead. See {@link jsoncSafe}.
   */
  declare static safe: typeof jsoncSafe;

  private static _loggers: ILoggers = createLoggers();

  /**
   * Configures the `jsonc` object. Currently, this sets the streams that `log()` and `logp()`
   * write to.
   *
   * @param cfg - Configuration. Omitted streams are reset to their defaults.
   *
   * @example
   * ```ts
   * // log to stdout, but logs containing errors to a file
   * jsonc.config({
   *   stream: process.stdout,
   *   streamErr: fs.createWriteStream('path/to/log.txt')
   * });
   * jsonc.log({ info: 'this is logged to console' });
   * jsonc.log(new Error('this is logged to file'));
   * ```
   */
  static config(cfg?: IConfig | null): void {
    jsonc._loggers = createLoggers(cfg);
  }

  /**
   * Stringifies and logs the given arguments to the configured stream. Circular references are
   * handled, so this won't throw. For an `Error` instance, its `stack` is logged (to the error
   * stream) instead of the stringified object.
   *
   * @param args - Values to be logged.
   *
   * @example
   * ```ts
   * jsonc.log({ a: 1 }, [1, 2]); // {"a":1} [1,2]
   * ```
   */
  static log(...args: any[]): void {
    jsonc._loggers.logger(...args);
  }

  /**
   * Pretty version of {@link jsonc.log}. Stringifies and logs the given arguments with 2-space
   * indents.
   *
   * @param args - Values to be logged.
   *
   * @example
   * ```ts
   * jsonc.logp({ a: 1 });
   * // {
   * //   "a": 1
   * // }
   * ```
   */
  static logp(...args: any[]): void {
    jsonc._loggers.prettyLogger(...args);
  }

  /**
   * Parses the given JSON string into a JavaScript value. The input string can include comments.
   *
   * @param str - JSON string to be parsed.
   * @param options - Either a parse options object or a reviver function.
   * @returns The parsed value.
   * @throws `JSONError` (from `parse-json`) if the string is not valid JSON. Comments are stripped
   * by default, so this does not throw for comments unless `stripComments` is `false`.
   *
   * @example
   * ```ts
   * jsonc.parse('// comments\n{"success":true}\n'); // { success: true }
   * jsonc.parse('{"a":1}', (key, value) => (key === 'a' ? 2 : value)); // { a: 2 }
   * ```
   */
  static parse(str: string, options?: IParseOptions | Reviver): any {
    const opts: IParseOptions =
      typeof options === 'function' ? { reviver: options } : { ...options };
    if (opts.stripComments !== false) str = stripJsonComments(str, { whitespace: false });
    return parseJson(str, opts.reviver);
  }

  /**
   * Outputs a JSON string from the given JavaScript value. Supports both an options object and the
   * signature of the native `JSON.stringify()`. By default, circular references are replaced with
   * the string `"[Circular]"`, so this does not throw for them.
   *
   * @param value - Value to be stringified.
   * @param optionsOrReplacer - Stringify options, or a replacer (function or allow-list array).
   * @param space - Indentation; takes effect when the second argument is a replacer or falsy.
   * @returns The JSON string.
   * @throws `TypeError` if `handleCircular` is `false` and the value has circular references; or if
   * a getter or `toJSON()` throws. Use {@link jsoncSafe.stringify} to avoid throwing.
   *
   * @example
   * ```ts
   * const obj = { key: 'value' };
   * jsonc.stringify(obj); // '{"key":"value"}'
   *
   * // pretty output with indents
   * jsonc.stringify(obj, null, 2);
   * // equivalent to:
   * jsonc.stringify(obj, { space: 2 });
   * ```
   */
  static stringify(
    value: any,
    optionsOrReplacer?: IStringifyOptions | Replacer | null,
    space?: string | number
  ): string {
    const opts = getStringifyOptions(optionsOrReplacer, space);
    return opts.handleCircular
      ? fastSafeStringify(value, opts.replacer as any, opts.space)
      : JSON.stringify(value, opts.replacer as any, opts.space);
  }

  /**
   * Specifies whether the given string has a well-formed JSON structure. JSON is built on two
   * structures: a collection of name/value pairs (object) or an ordered list of values (array). So
   * not every JSON-parsable string is considered well-formed here; e.g. `JSON.parse('true')`
   * succeeds but `jsonc.isJSON('true')` returns `false`.
   *
   * @param str - String to be validated.
   * @param allowComments - Whether comments should be considered valid. Default: `false`
   *
   * @example
   * ```ts
   * jsonc.isJSON('{"x":1}');          // true
   * jsonc.isJSON('true');             // false
   * jsonc.isJSON('[1, false, null]'); // true
   * jsonc.isJSON('string');           // false
   * jsonc.isJSON('null');             // false
   * ```
   */
  static isJSON(str: string, allowComments = false): boolean {
    if (typeof str !== 'string') return false;
    try {
      const result = jsonc.parse(str, { stripComments: allowComments });
      return isObject(result) || Array.isArray(result);
    } catch {
      return false;
    }
  }

  /**
   * Strips comments from the given JSON string.
   *
   * @param str - JSON string.
   * @param whitespace - Whether to replace comments with whitespace instead of stripping them
   * entirely. Default: `false`
   * @returns The JSON string without comments.
   *
   * @example
   * ```ts
   * jsonc.stripComments('// comments\n{"key":"value"}'); // '\n{"key":"value"}'
   * ```
   */
  static stripComments(str: string, whitespace = false): string {
    return stripJsonComments(str, { whitespace });
  }

  /**
   * Uglifies (minifies) the given JSON string. Comments are removed.
   *
   * @param str - JSON string to be uglified.
   * @returns The uglified JSON string.
   *
   * @example
   * ```ts
   * jsonc.uglify('{\n  // comments...\n  "key": "value"\n}'); // '{"key":"value"}'
   * ```
   */
  static uglify(str: string): string {
    return jsonc.stringify(jsonc.parse(str));
  }

  /**
   * Beautifies the given JSON string. Comments are removed.
   *
   * @param str - JSON string to be beautified.
   * @param space - Indentation; a number of spaces or an indent string. A falsy value falls back to
   * the default. Default: `2`
   * @returns The beautified JSON string.
   *
   * @example
   * ```ts
   * jsonc.beautify('{"key":"value"}');
   * // {
   * //   "key": "value"
   * // }
   * ```
   */
  static beautify(str: string, space: string | number = 2): string {
    if (!space) space = 2;
    return jsonc.stringify(jsonc.parse(str), { space });
  }

  /**
   * Normalizes the given value by stringifying it and parsing it back to plain JSON data. Class
   * instances become plain objects; circular references become `"[Circular]"`.
   *
   * @param value - Value to be normalized.
   * @param replacer - Determines how object values are normalized.
   * @returns The normalized value.
   *
   * @example
   * ```ts
   * const c = new SomeClass();
   * c.constructor.name;                   // 'SomeClass'
   * jsonc.normalize(c).constructor.name;  // 'Object'
   * ```
   */
  static normalize(value: any, replacer?: Replacer | null): any {
    return jsonc.parse(jsonc.stringify(value, { replacer }));
  }

  /**
   * Asynchronously reads a JSON file, strips the UTF-8 BOM and comments, and parses the content.
   *
   * @param filePath - Path to the JSON file.
   * @param options - Read options.
   * @returns A promise of the parsed content.
   *
   * @example
   * ```ts
   * try {
   *   const obj = await jsonc.read('path/to/file.json');
   * } catch (err) {
   *   console.log('Failed to read JSON file');
   * }
   * ```
   */
  static async read(filePath: string, options?: IReadOptions): Promise<any> {
    const data = await readFileAsync(filePath, 'utf8');
    return readContent(data, filePath, options);
  }

  /**
   * Synchronously reads a JSON file, strips the UTF-8 BOM and comments, and parses the content.
   *
   * @param filePath - Path to the JSON file.
   * @param options - Read options.
   * @returns The parsed content.
   *
   * @example
   * ```ts
   * // throws on failure; use jsonc.safe.readSync() to avoid try/catch
   * const obj = jsonc.readSync('path/to/file.json');
   * ```
   */
  static readSync(filePath: string, options?: IReadOptions): any {
    return readContent(fs.readFileSync(filePath, 'utf8'), filePath, options);
  }

  /**
   * Asynchronously stringifies the given value and writes it to a JSON file (with a trailing
   * newline). Parent directories are created by default.
   *
   * @param filePath - Path to the JSON file to be written.
   * @param data - Value to be stringified into JSON.
   * @param options - Write options.
   * @returns A promise that resolves with `true` when written.
   *
   * @example
   * ```ts
   * await jsonc.write('path/to/file.json', { key: 'value' }, { space: 2 });
   * ```
   */
  static async write(filePath: string, data: any, options?: IWriteOptions): Promise<boolean> {
    const opts: IWriteOptions = { mode: 0o666, autoPath: true, ...options };
    if (opts.autoPath) await mkdirAsync(path.dirname(filePath), { recursive: true });
    await writeFileAsync(filePath, writeContent(data, opts), { mode: opts.mode });
    return true;
  }

  /**
   * Synchronously stringifies the given value and writes it to a JSON file (with a trailing
   * newline). Parent directories are created by default.
   *
   * @param filePath - Path to the JSON file to be written.
   * @param data - Value to be stringified into JSON.
   * @param options - Write options.
   * @returns `true` when written.
   *
   * @example
   * ```ts
   * // throws on failure; use jsonc.safe.writeSync() to avoid try/catch
   * jsonc.writeSync('path/to/file.json', { key: 'value' });
   * ```
   */
  static writeSync(filePath: string, data: any, options?: IWriteOptions): boolean {
    const opts: IWriteOptions = { mode: 0o666, autoPath: true, ...options };
    if (opts.autoPath) fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, writeContent(data, opts), { mode: opts.mode });
    return true;
  }
}

export { jsonc };
