/**
 * A function that transforms the parsed results. It receives each key and value; its return value
 * is used instead of the original value. If it returns `undefined`, the member is deleted.
 */
export type Reviver = (key: string, value: any) => any;

/**
 * Determines how object values are stringified. Either a function that receives each key and value
 * and returns the value to be used, or an array of property names (strings or numbers) that acts as
 * an allow-list for the properties to be included.
 */
export type Replacer = ((key: string, value: any) => any) | (string | number)[];

/** Options for {@link jsonc.parse}. */
export interface IParseOptions {
  /** A function that transforms the parsed results. */
  reviver?: Reviver;
  /**
   * Whether to strip comments from the JSON string before parsing. Parsing throws if this is
   * `false` and the string includes comments. Default: `true`
   */
  stripComments?: boolean;
  /**
   * Whether to allow trailing commas in objects and arrays (as in JSONC files such as
   * `tsconfig.json`). Takes effect only when comments are stripped. Default: `false`
   */
  allowTrailingCommas?: boolean;
}

/** Options for {@link jsonc.stringify}. */
export interface IStringifyOptions {
  /** Determines how object values are stringified. */
  replacer?: Replacer | null;
  /**
   * Indentation of nested structures. A number is the count of spaces per level; a string (such as
   * `'\t'`) is used as the indent itself. Omit for packed output.
   */
  space?: string | number;
  /**
   * Whether to handle circular references by replacing their values with the string
   * `"[Circular]"`. Default: `true`
   */
  handleCircular?: boolean;
}

/** Options for {@link jsonc.read} and {@link jsonc.readSync}. */
export interface IReadOptions extends IParseOptions {}

/** Options for {@link jsonc.write} and {@link jsonc.writeSync}. */
export interface IWriteOptions {
  /** File-system permission mode used when writing the file. Default: `0o666` (`438`) */
  mode?: number;
  /**
   * Whether to create the parent directories of the file path if they don't exist. Writing throws
   * if this is `false` and the directory does not exist. Default: `true`
   */
  autoPath?: boolean;
  /** Determines how object values are stringified. */
  replacer?: Replacer | null;
  /** Indentation of nested structures. Omit for packed output. */
  space?: string | number;
  /**
   * Whether to handle circular references by replacing their values with the string
   * `"[Circular]"`. Writing throws for circular references if this is `false`. Default: `true`
   */
  handleCircular?: boolean;
}

/** Configuration for the `log()` / `logp()` methods. */
export interface IConfig {
  /** Stream to write logs to. Default: `process.stdout` */
  stream?: NodeJS.WritableStream;
  /** Stream to write logs that contain an `Error` to. Default: `process.stderr` */
  streamErr?: NodeJS.WritableStream;
}

/** The result tuple of a safe method: `[error, undefined]` on failure, `[null, result]` on success. */
export type SafeResult<T> = [Error, undefined] | [null, T];
