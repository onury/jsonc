export type Reviver = (key: string, value: any) => any;
export type Replacer = (key: string, value: any) => any | string[] | number[];

export interface IParseOptions {
    reviver?: Reviver;
    stripComments?: boolean;
}

export interface IStringifyOptions {
    replacer?: Replacer;
    space?: string | number;
    handleCircular?: boolean;
}

export interface IReadOptions extends IParseOptions {}

export interface IWriteOptions {
    mode?: number;
    autoPath?: boolean;
    replacer?: Replacer;
    space?: string | number;
}

export interface IConfig {
    stream?: NodeJS.WriteStream;
    streamErr?: NodeJS.WriteStream;
}
