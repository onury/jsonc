// dep modules
import fss from 'fast-safe-stringify';

// own modules
import type { IConfig, IStringifyOptions, Replacer, SafeResult } from './types.js';

// Internal helpers; not part of the public API.

/** `fast-safe-stringify` is CommonJS; its typings expose the function as `.default`. */
const fastSafeStringify = fss.default;

// fast-safe-stringify swallows whatever JSON.stringify() throws (a BigInt, a throwing `toJSON()`,
// etc…) and returns this placeholder instead.
const UNSERIALIZABLE = '"[unable to serialize, circular reference is too complex to analyze]"';

/**
 * Stringifies with circular references replaced by `"[Circular]"`, but lets any other
 * serialization error surface (native `JSON.stringify()` rethrows it) instead of returning the
 * fast-safe-stringify placeholder.
 */
export function circularStringify(value: any, replacer?: any, space?: string | number): string {
  const out = fastSafeStringify(value, replacer, space);
  return out === UNSERIALIZABLE ? JSON.stringify(value, replacer, space) : out;
}

export function isObject(o: any): boolean {
  return Object.prototype.toString.call(o) === '[object Object]';
}

export function stripBOM(str: string): string {
  return str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
}

export function strLog(value: any, pretty: boolean): string {
  // primitives are logged as is; `null` goes through stringify, which yields `'null'` as well.
  const t = typeof value;
  if (t !== 'object' && t !== 'function') return String(value);
  return fastSafeStringify(value, undefined, pretty ? 2 : undefined);
}

export function getLogger(config: Required<IConfig>, pretty: boolean): (...args: any[]) => void {
  return (...args: any[]): void => {
    let stream = config.stream;
    const msg = args
      .map((arg) => {
        if (arg instanceof Error) {
          stream = config.streamErr;
          return arg.stack || arg.message || String(arg);
        }
        return strLog(arg, pretty);
      })
      .join(' ');
    stream.write(`${msg}\n`);
  };
}

export function getStringifyOptions(
  options?: IStringifyOptions | Replacer | null,
  space?: string | number
): IStringifyOptions {
  if (isObject(options)) return options as IStringifyOptions;
  // anything else is the replacer of the native signature; JSON.stringify ignores invalid ones.
  return { replacer: options as Replacer | null, space };
}

export function safeSync<A extends any[], T>(fn: (...args: A) => T): (...args: A) => SafeResult<T> {
  return (...args: A): SafeResult<T> => {
    try {
      return [null, fn(...args)];
    } catch (err) {
      return [err as Error, undefined];
    }
  };
}

export function safeAsync<T>(promise: Promise<T>): Promise<SafeResult<T>> {
  return promise.then(
    (data): SafeResult<T> => [null, data],
    (err): SafeResult<T> => [err as Error, undefined]
  );
}
