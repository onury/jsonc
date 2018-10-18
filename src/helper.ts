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

    safeSync(fn: any): any {
        return (...args): [Error] | [null, any] => {
            try {
                return [null, fn(...args)];
            } catch (err) {
                return [err];
            }
        };
    },

    safeAsync(promise: Promise<any>): Promise<any> {
        return promise.then(data => [null, data]).catch(err => [err]);
    }

};

export { helper };
