import * as mkdirp from 'mkdirp';
import { IConfig, IStringifyOptions, Replacer } from './interfaces';
declare const helper: {
    isObject(o: any): boolean;
    isPrimitive(value: any): boolean;
    strLog(value: any, pretty: boolean): string;
    getLogger(config: IConfig, pretty: boolean): Function;
    getStringifyOptions(options: IStringifyOptions | Replacer, space: string | number): IStringifyOptions;
    fs: any;
    mkdirp: typeof mkdirp;
    promise: {
        readFile: any;
        writeFile: any;
        mkdirp: any;
    };
    safeSync(fn: any): any;
    safeAsync(promise: Promise<any>): Promise<any>;
};
export { helper };
