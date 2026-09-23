// own modules
import { safeAsync, safeSync } from './helper.js';
import { jsonc } from './jsonc.js';
import type {
  IConfig,
  IParseOptions,
  IReadOptions,
  IStringifyOptions,
  IWriteOptions,
  Replacer,
  Reviver,
  SafeResult
} from './types.js';

/**
 * Safe versions of the `jsonc` methods; exposed as `jsonc.safe` and as the named `safe` export.
 * Safe methods never throw, so you don't need try/catch blocks. Each method (except a few that
 * can't fail, such as `isJSON()`) returns an `[err, result]` tuple: the caught `Error` first, or
 * `null` and the result on success.
 *
 * @example
 * ```ts
 * import { safe as jsonc } from 'jsonc';
 *
 * const [err, result] = jsonc.parse('[invalid JSON}');
 * if (err) {
 *   console.log(`Failed to parse JSON: ${err.message}`);
 * } else {
 *   console.log(result);
 * }
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: the static-class shape is the published API since v1.
class jsoncSafe {
  /**
   * Same as {@link jsonc.config}; added for convenience.
   *
   * @param cfg - Configuration. Omitted streams are reset to their defaults.
   */
  static config(cfg?: IConfig | null): void {
    jsonc.config(cfg);
  }

  /**
   * Same as {@link jsonc.log}; added for convenience.
   *
   * @param args - Values to be logged.
   */
  static log(...args: any[]): void {
    jsonc.log(...args);
  }

  /**
   * Same as {@link jsonc.logp}; added for convenience.
   *
   * @param args - Values to be logged.
   */
  static logp(...args: any[]): void {
    jsonc.logp(...args);
  }

  /**
   * Safe version of {@link jsonc.parse}.
   *
   * @param str - JSON string to be parsed.
   * @param options - Either a parse options object or a reviver function.
   * @returns `[err, undefined]` on failure, `[null, value]` on success.
   *
   * @example
   * ```ts
   * import { safe as jsonc } from 'jsonc';
   *
   * const [err, result] = jsonc.parse('--invalid JSON--');
   * if (err) console.log(`Failed to parse JSON: ${err.message}`);
   * ```
   */
  static parse<T = any>(str: string, options?: IParseOptions | Reviver): SafeResult<T> {
    return safeSync(jsonc.parse<T>)(str, options);
  }

  /**
   * Safe version of {@link jsonc.stringify}. Circular references are replaced with the string
   * `"[Circular]"` unless `handleCircular` is `false`; in which case they result in an error.
   *
   * @param value - Value to be stringified.
   * @param optionsOrReplacer - Stringify options, or a replacer (function or allow-list array).
   * @param space - Indentation; takes effect when the second argument is a replacer or falsy.
   * @returns `[err, undefined]` on failure, `[null, string]` on success.
   *
   * @example
   * ```ts
   * import { safe as jsonc } from 'jsonc';
   *
   * const [err, str] = jsonc.stringify({ key: 'value' }, null, 2);
   * if (!err) console.log(str);
   * ```
   */
  static stringify(value: any, options?: IStringifyOptions | null): SafeResult<string>;
  static stringify(
    value: any,
    replacer: Replacer | null,
    space?: string | number
  ): SafeResult<string>;
  static stringify(
    value: any,
    optionsOrReplacer?: IStringifyOptions | Replacer | null,
    space?: string | number
  ): SafeResult<string> {
    return safeSync(jsonc.stringify)(value, optionsOrReplacer, space);
  }

  /**
   * Same as {@link jsonc.isJSON}; added for convenience. Returns a `boolean`, not a tuple.
   *
   * @param str - String to be validated.
   * @param allowComments - Whether comments should be considered valid. Default: `false`
   */
  static isJSON(str: string, allowComments = false): boolean {
    return jsonc.isJSON(str, allowComments);
  }

  /**
   * Safe version of {@link jsonc.stripComments}.
   *
   * @param str - JSON string.
   * @param whitespace - Whether to replace comments with whitespace instead of stripping them
   * entirely. Default: `false`
   * @returns `[err, undefined]` on failure, `[null, string]` on success.
   */
  static stripComments(str: string, whitespace = false): SafeResult<string> {
    return safeSync(jsonc.stripComments)(str, whitespace);
  }

  /**
   * Safe version of {@link jsonc.uglify}.
   *
   * @param str - JSON string to be uglified.
   * @returns `[err, undefined]` on failure, `[null, string]` on success.
   */
  static uglify(str: string): SafeResult<string> {
    return safeSync(jsonc.uglify)(str);
  }

  /**
   * Safe version of {@link jsonc.beautify}.
   *
   * @param str - JSON string to be beautified.
   * @param space - Indentation; a number of spaces or an indent string. Default: `2`
   * @returns `[err, undefined]` on failure, `[null, string]` on success.
   */
  static beautify(str: string, space: string | number = 2): SafeResult<string> {
    return safeSync(jsonc.beautify)(str, space);
  }

  /**
   * Safe version of {@link jsonc.normalize}.
   *
   * @param value - Value to be normalized.
   * @param replacer - Determines how object values are normalized.
   * @returns `[err, undefined]` on failure, `[null, value]` on success.
   */
  static normalize<T = any>(value: any, replacer?: Replacer | null): SafeResult<T> {
    return safeSync(jsonc.normalize<T>)(value, replacer);
  }

  /**
   * Safe version of {@link jsonc.read}. The returned promise never rejects.
   *
   * @param filePath - Path to the JSON file.
   * @param options - Read options.
   * @returns A promise of `[err, undefined]` on failure, `[null, value]` on success.
   *
   * @example
   * ```ts
   * import { safe as jsonc } from 'jsonc';
   *
   * const [err, obj] = await jsonc.read('path/to/file.json');
   * if (err) console.log('Failed to read JSON file');
   * ```
   */
  static read<T = any>(filePath: string, options?: IReadOptions): Promise<SafeResult<T>> {
    return safeAsync(jsonc.read<T>(filePath, options));
  }

  /**
   * Safe version of {@link jsonc.readSync}.
   *
   * @param filePath - Path to the JSON file.
   * @param options - Read options.
   * @returns `[err, undefined]` on failure, `[null, value]` on success.
   */
  static readSync<T = any>(filePath: string, options?: IReadOptions): SafeResult<T> {
    return safeSync(jsonc.readSync<T>)(filePath, options);
  }

  /**
   * Safe version of {@link jsonc.write}. The returned promise never rejects.
   *
   * @param filePath - Path to the JSON file to be written.
   * @param data - Value to be stringified into JSON.
   * @param options - Write options.
   * @returns A promise of `[err, undefined]` on failure, `[null, true]` on success.
   *
   * @example
   * ```ts
   * import { safe as jsonc } from 'jsonc';
   *
   * const [err] = await jsonc.write('path/to/file.json', data);
   * if (err) console.log('Failed to write JSON file');
   * ```
   */
  static write(filePath: string, data: any, options?: IWriteOptions): Promise<SafeResult<true>> {
    return safeAsync(jsonc.write(filePath, data, options));
  }

  /**
   * Safe version of {@link jsonc.writeSync}.
   *
   * @param filePath - Path to the JSON file to be written.
   * @param data - Value to be stringified into JSON.
   * @param options - Write options.
   * @returns `[err, undefined]` on failure, `[null, true]` on success.
   */
  static writeSync(filePath: string, data: any, options?: IWriteOptions): SafeResult<true> {
    return safeSync(jsonc.writeSync)(filePath, data, options);
  }
}

export { jsoncSafe };
