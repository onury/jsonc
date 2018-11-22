// dep modules
import fastSafeStringify from 'fast-safe-stringify';
import * as fs from 'graceful-fs';
import * as mkdirp from 'mkdirp';

// own modules
import { IConfig, IStringifyOptions, Replacer } from './interfaces';

// vars
const oproto = Object.prototype;

// simple promisification. this won't work for callbacks with more than 2
// args.
function promisify(fn: Function): any {
    return (...args) => {
        return new Promise((resolve, reject) => {
            fn(...args, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    };
}

const defaultStringifyOpts: IStringifyOptions = {
    replacer: null,
    space: 0,
    handleCircular: true
};

const helper = {

    isObject(o: any): boolean {
        return oproto.toString.call(o) === '[object Object]';
    },

    isPrimitive(value: any): boolean {
        const t = typeof value;
        return value === null
            || value === undefined
            || (t !== 'function' && t !== 'object');
    },

    strLog(value: any, pretty: boolean): string {
        if (helper.isPrimitive(value)) return value;
        const s = pretty ? '  ' : null;
        return fastSafeStringify(value, null, s);
    },

    getLogger(config: IConfig, pretty: boolean): Function {
        return (...args: any[]): void => {
            let stream = config.stream;
            const msg: string = args.map(arg => {
                if (arg instanceof Error) {
                    stream = config.streamErr;
                    return arg.stack
                        /* istanbul ignore next */
                        || arg.message
                        /* istanbul ignore next */
                        || String(arg);
                }
                return helper.strLog(arg, pretty);
            }).join(' ');
            stream.write(msg + '\n');
        };
    },

    getStringifyOptions(options: IStringifyOptions | Replacer, space: string | number): IStringifyOptions {
        if (helper.isObject(options)) {
            return {
                ...defaultStringifyOpts,
                ...options
            }; // as IStringifyOptions
        }

        if (typeof options === 'function' || Array.isArray(options)) {
            return {
                ...defaultStringifyOpts,
                replacer: options as Replacer,
                space
            };
        }

        return {
            ...defaultStringifyOpts,
            space
        };
    },

    fs,
    mkdirp,

    promise: {
        readFile: promisify(fs.readFile),
        writeFile: promisify(fs.writeFile),
        mkdirp: promisify(mkdirp)
    },

    safeSync<T, U = any>(fn: (...args: any[]) => T): (...args: any[]) => [U | null, T | undefined] {
        return (...args: any[]): [U | null, T | undefined] => {
            try {
                return [null, fn(...args) as T];
            } catch (err) {
                return [err, undefined] as [U, undefined];
            }
        };
    },

    safeAsync<T, U = any>(promise: Promise<T>): Promise<[U | null, T | undefined]> {
        return promise
            .then<[null, T]>((data: T) => [null, data])
            .catch<[U, undefined]>(err => [err, undefined]);
    }

};

export { helper };
