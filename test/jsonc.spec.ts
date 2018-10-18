// core modules
import * as path from 'path';

// dep modules
import * as fs from 'graceful-fs';

// own modules
import { IParseOptions, IReadOptions, IWriteOptions } from '../src/interfaces';
import { jsonc } from '../src/jsonc';
import { streamLog } from './helpers/streamLog';

function _removeDirRecursiveSync(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach(file => {
            const curPath = path.join(dirPath, file);
            if (fs.statSync(curPath).isDirectory()) {
                _removeDirRecursiveSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(dirPath);
    }
}

describe('jsonc', () => {

    const validJsonWithComments = `
    // comments will be stripped...
    {
        "some": /* special */ "property",
        "value": 1 // don't change this!!!
    }
    `;

    const invalidJson = '[invalid JSON}';

    class MyClass {
        a: number;
        b: string;
        constructor() {
            this.a = 1;
            this.b = 'prop';
        }
    }

    test('.parse()', () => {
        // throw on comments
        const opts: IParseOptions = { stripComments: false };
        expect(() => jsonc.parse(validJsonWithComments, opts)).toThrow();

        // strip comments and parse
        let result = jsonc.parse(validJsonWithComments);
        expect(typeof result).toEqual('object');
        expect(result.value).toEqual(1);

        const reviver = (key: string, value: any) => {
            return key === 'some' ? 'modified ' + value : value;
        };

        result = jsonc.parse(validJsonWithComments, reviver);
        expect(typeof result).toEqual('object');
        expect(result.some).toEqual('modified property');

        result = jsonc.parse(validJsonWithComments, { reviver });
        expect(typeof result).toEqual('object');
        expect(result.some).toEqual('modified property');
    });

    test('.safe.parse()', () => {
        let [err, result] = jsonc.safe.parse(validJsonWithComments);
        // jsonc.stringify()
        expect(typeof result).toEqual('object');
        expect(result.value).toEqual(1);

        [err, result] = jsonc.safe.parse(invalidJson);
        expect(err instanceof Error).toEqual(true);
        expect(result).toBeUndefined();

        expect(() => jsonc.parse(invalidJson)).toThrow();
    });

    test('.stringify()', () => {
        const o = { a: 1, b: 'text' };
        expect(typeof jsonc.stringify(o)).toEqual('string');

        const expected = '{\n  "a": 1,\n  "b": "text"\n}';
        let result = jsonc.stringify(o, null, 2);
        expect(result).toEqual(expected);
        result = jsonc.stringify(o, { space: 2 });
        expect(result).toEqual(expected);

        const replacer = (key: string, value: any) => {
            return key === 'b' ? 'modified ' + value : value;
        };
        result = jsonc.stringify(o, replacer, 2);
        expect(result).toEqual('{\n  "a": 1,\n  "b": "modified text"\n}');
        result = jsonc.stringify(o, { replacer, space: 2 });
        expect(result).toEqual('{\n  "a": 1,\n  "b": "modified text"\n}');

        const x = { a: 1, b: 'text' };
        (x as any).y = x; // circular
        expect(() => jsonc.stringify(x, { handleCircular: false })).toThrow();
    });

    test('.safe.stringify()', () => {
        const x = { a: 1, b: 'text' };
        (x as any).y = x; // circular
        expect(() => jsonc.safe.stringify(x)).not.toThrow();
        expect(() => jsonc.safe.stringify(x, { handleCircular: false })).not.toThrow();

        let [err, result] = jsonc.safe.stringify(x);
        expect(err).toEqual(null);
        expect(typeof result).toEqual('string');

        const o = {
            get error(): any {
                throw new Error();
            }
        };
        [err, result] = jsonc.safe.stringify(o);
        expect(err instanceof Error).toEqual(true);
    });

    test('.isJSON()', () => {
        expect(jsonc.isJSON(5 as any)).toEqual(false);
        expect(jsonc.isJSON({} as any)).toEqual(false);
        expect(jsonc.isJSON('true')).toEqual(false);
        expect(jsonc.isJSON('1')).toEqual(false);
        expect(jsonc.isJSON('null')).toEqual(false);
        expect(jsonc.isJSON('[null]')).toEqual(true);
        expect(jsonc.isJSON('{}')).toEqual(true);
        expect(jsonc.isJSON('// comments\n{"x":/*test*/1}')).toEqual(false);
        expect(jsonc.isJSON('// comments\n{"x":/*test*/1}', true)).toEqual(true);
    });

    test('.safe.isJSON()', () => {
        expect(jsonc.safe.isJSON(5 as any)).toEqual(false);
        expect(jsonc.safe.isJSON({} as any)).toEqual(false);
        expect(jsonc.safe.isJSON('true')).toEqual(false);
        expect(jsonc.safe.isJSON('1')).toEqual(false);
        expect(jsonc.safe.isJSON('null')).toEqual(false);
        expect(jsonc.safe.isJSON('[null]')).toEqual(true);
        expect(jsonc.safe.isJSON('{}')).toEqual(true);
        expect(jsonc.safe.isJSON('// comments\n{"x":/*test*/1}')).toEqual(false);
        expect(jsonc.safe.isJSON('// comments\n{"x":/*test*/1}', true)).toEqual(true);
    });

    test('.stripComments()', () => {
        expect(jsonc.stripComments('// comments\n{"x":/*test*/1}')).toEqual('\n{"x":1}');
        expect(jsonc.stripComments('// comments\n{"x":/*test*/1}', true)).toEqual('           \n{"x":        1}');
    });

    test('.safe.stripComments()', () => {
        expect(jsonc.safe.stripComments('// comments\n{"x":/*test*/1}')[1]).toEqual('\n{"x":1}');
        expect(jsonc.safe.stripComments('// comments\n{"x":/*test*/1}', true)[1]).toEqual('           \n{"x":        1}');
    });

    test('.uglify()', () => {
        expect(jsonc.uglify(validJsonWithComments)).toEqual('{"some":"property","value":1}');
    });

    test('.safe.uglify()', () => {
        expect(jsonc.safe.uglify(validJsonWithComments)[1]).toEqual('{"some":"property","value":1}');
    });

    test('.beautify()', () => {
        const ugly = jsonc.uglify(validJsonWithComments);
        const with2spaces = '{\n  "some": "property",\n  "value": 1\n}';
        expect(jsonc.beautify(ugly)).toEqual(with2spaces);
        expect(jsonc.beautify(ugly, 0)).toEqual(with2spaces);
        expect(jsonc.beautify(ugly)).toEqual('{\n  "some": "property",\n  "value": 1\n}');
        expect(jsonc.beautify(ugly, 4)).toEqual('{\n    "some": "property",\n    "value": 1\n}');
    });

    test('.safe.beautify()', () => {
        const [err, ugly] = jsonc.safe.uglify(validJsonWithComments);
        const with2spaces = '{\n  "some": "property",\n  "value": 1\n}';
        expect(jsonc.safe.beautify(ugly as string)[1]).toEqual(with2spaces);
        expect(jsonc.safe.beautify(ugly as string, 0)[1]).toEqual(with2spaces);
        expect(jsonc.safe.beautify(ugly as string)[1]).toEqual('{\n  "some": "property",\n  "value": 1\n}');
        expect(jsonc.safe.beautify(ugly as string, 4)[1]).toEqual('{\n    "some": "property",\n    "value": 1\n}');
    });

    test('.normalize()', () => {
        const mc = new MyClass();
        let normalized = jsonc.normalize(mc);
        expect(mc.constructor.name).toEqual('MyClass'); // for convinience
        expect(normalized.constructor.name).toEqual('Object');

        normalized = jsonc.normalize(mc, (key: string, value: any) => {
            return key === 'b' ? value + ' modified' : value;
        });
        expect(normalized.constructor.name).toEqual('Object');
        expect(normalized.b).toEqual('prop modified');
    });

    test('.safe.normalize()', () => {
        const mc = new MyClass();
        let err;
        let normalized;
        [err, normalized] = jsonc.safe.normalize(mc);
        expect(mc.constructor.name).toEqual('MyClass'); // for convinience
        expect(normalized.constructor.name).toEqual('Object');

        [err, normalized] = jsonc.safe.normalize(mc, (key: string, value: any) => {
            return key === 'b' ? value + ' modified' : value;
        });
        expect(normalized.constructor.name).toEqual('Object');
        expect(normalized.b).toEqual('prop modified');
    });

    const asyncFilePath = './test/tmp/test.json';
    async function readWrite(data: any, writeOpts?: IWriteOptions, readOpts?: IReadOptions): Promise<any> {
        await jsonc.write(asyncFilePath, data, writeOpts);
        return jsonc.read(asyncFilePath, readOpts);
    }

    test('.write() & .read()', async () => {
        expect.assertions(9);

        const data = { test: 'file', x: 1 };

        let obj = await readWrite(data);
        expect(obj.test).toEqual('file');
        expect(data.test).toEqual(obj.test);

        const readOpts: IReadOptions = {
            stripComments: false,
            reviver: (key: string, value: any) => key === 'x' ? 5 : value
        };
        obj = await readWrite(data, null, readOpts);
        expect(obj.test).toEqual('file');
        expect(obj.x).toEqual(5);
        expect(data.test).toEqual(obj.test);

        const writeOpts: IWriteOptions = {
            replacer: (key: string, value: any) => key === 'x' ? 5 : value,
            autoPath: true,
            space: 2
        };
        obj = await readWrite(data, writeOpts);
        expect(obj.test).toEqual('file');
        expect(obj.x).toEqual(5);
        expect(data.test).toEqual(obj.test);

        _removeDirRecursiveSync(path.dirname(asyncFilePath));

        await expect(readWrite(data, { autoPath: false })).rejects.toThrow();
    });

    async function safeReadWrite(data: any, writeOpts?: IWriteOptions, readOpts?: IReadOptions): Promise<any> {
        await jsonc.safe.write(asyncFilePath, data, writeOpts);
        return jsonc.safe.read(asyncFilePath, readOpts);
    }
    test('.safe.write() & .safe.read()', async () => {
        expect.assertions(12);

        const data = { test: 'file', x: 1 };

        let [err, obj] = await safeReadWrite(data);
        expect(err).toEqual(null);
        expect(obj.test).toEqual('file');
        expect(data.test).toEqual(obj.test);

        const readOpts: IReadOptions = {
            stripComments: false,
            reviver: (key: string, value: any) => key === 'x' ? 5 : value
        };
        [err, obj] = await safeReadWrite(data, null, readOpts);
        expect(err).toEqual(null);
        expect(obj.test).toEqual('file');
        expect(obj.x).toEqual(5);
        expect(data.test).toEqual(obj.test);

        const writeOpts: IWriteOptions = {
            replacer: (key: string, value: any) => key === 'x' ? 5 : value,
            autoPath: true,
            space: 2
        };
        [err, obj] = await safeReadWrite(data, writeOpts);
        expect(err).toEqual(null);
        expect(obj.test).toEqual('file');
        expect(obj.x).toEqual(5);
        expect(data.test).toEqual(obj.test);

        _removeDirRecursiveSync(path.dirname(asyncFilePath));

        await expect(safeReadWrite(data, { autoPath: false })).resolves.not.toThrow();
    });

    const syncFilePath = './test/tmp/test-sync.json';
    function readWriteSync(data: any, writeOpts?: IWriteOptions, readOpts?: IReadOptions): any {
        jsonc.writeSync(syncFilePath, data, writeOpts);
        return jsonc.readSync(syncFilePath, readOpts);
    }

    test('.writeSync() & .readSync()', () => {
        const data = { test: 'file', x: 1 };

        let obj = readWriteSync(data);
        expect(obj.test).toEqual('file');
        expect(data.test).toEqual(obj.test);

        const readOpts: IReadOptions = {
            stripComments: false,
            reviver: (key: string, value: any) => key === 'x' ? 5 : value
        };
        obj = readWriteSync(data, null, readOpts);
        expect(obj.test).toEqual('file');
        expect(obj.x).toEqual(5);
        expect(data.test).toEqual(obj.test);

        const writeOpts: IWriteOptions = {
            replacer: (key: string, value: any) => key === 'x' ? 5 : value,
            autoPath: true,
            space: 2
        };
        obj = readWriteSync(data, writeOpts);
        expect(obj.test).toEqual('file');
        expect(obj.x).toEqual(5);
        expect(data.test).toEqual(obj.test);

        _removeDirRecursiveSync(path.dirname(syncFilePath));

        expect(() => readWriteSync(data, { autoPath: false })).toThrow();
    });

    function safeReadWriteSync(data: any, writeOpts?: IWriteOptions, readOpts?: IReadOptions): any {
        jsonc.safe.writeSync(syncFilePath, data, writeOpts);
        return jsonc.safe.readSync(syncFilePath, readOpts);
    }

    test('.safe.writeSync() & .safe.readSync()', () => {
        const data = { test: 'file', x: 1 };

        let [err, obj] = safeReadWriteSync(data);
        expect(err).toEqual(null);
        expect(obj.test).toEqual('file');
        expect(data.test).toEqual(obj.test);

        const readOpts: IReadOptions = {
            stripComments: false,
            reviver: (key: string, value: any) => key === 'x' ? 5 : value
        };
        [err, obj] = safeReadWriteSync(data, null, readOpts);
        expect(err).toEqual(null);
        expect(obj.test).toEqual('file');
        expect(obj.x).toEqual(5);
        expect(data.test).toEqual(obj.test);

        const writeOpts: IWriteOptions = {
            replacer: (key: string, value: any) => key === 'x' ? 5 : value,
            autoPath: true,
            space: 2
        };
        [err, obj] = safeReadWriteSync(data, writeOpts);
        expect(err).toEqual(null);
        expect(obj.test).toEqual('file');
        expect(obj.x).toEqual(5);
        expect(data.test).toEqual(obj.test);

        _removeDirRecursiveSync(path.dirname(syncFilePath));

        expect(() => safeReadWriteSync(data, { autoPath: false })).not.toThrow();
    });

    test('.config() & .log() & .logp()', async () => {
        expect.assertions(8);

        expect(await streamLog(jsonc, 'log', [{ test: true }])).toMatch('{"test":true}'); // obj
        expect(await streamLog(jsonc, 'log', [[1, 2, 3]])).toMatch('[1,2,3]'); // array
        expect(await streamLog(jsonc, 'log', [true])).toMatch('true'); // primitive
        expect(await streamLog(jsonc, 'log', [new Error('logged error')])).toMatch('logged error'); // error

        expect(await streamLog(jsonc, 'logp', [{ test: true }])).toMatch('{\n  "test": true\n}\n');
        expect(await streamLog(jsonc, 'logp', [[1, 2, 3]])).toMatch('[\n  1,\n  2,\n  3\n]\n'); // array
        expect(await streamLog(jsonc, 'logp', [true])).toMatch('true'); // primitive
        expect(await streamLog(jsonc, 'logp', [new Error('logged error')])).toMatch('logged error'); // error
    });

    test('.safe.config() & .safe.log() & .safe.logp()', async () => {
        expect.assertions(8);

        expect(await streamLog(jsonc.safe, 'log', [{ test: true }])).toMatch('{"test":true}'); // obj
        expect(await streamLog(jsonc.safe, 'log', [[1, 2, 3]])).toMatch('[1,2,3]'); // array
        expect(await streamLog(jsonc.safe, 'log', [true])).toMatch('true'); // primitive
        expect(await streamLog(jsonc.safe, 'log', [new Error('logged error')])).toMatch('logged error'); // error

        expect(await streamLog(jsonc.safe, 'logp', [{ test: true }])).toMatch('{\n  "test": true\n}\n');
        expect(await streamLog(jsonc.safe, 'logp', [[1, 2, 3]])).toMatch('[\n  1,\n  2,\n  3\n]\n'); // array
        expect(await streamLog(jsonc.safe, 'logp', [true])).toMatch('true'); // primitive
        expect(await streamLog(jsonc.safe, 'logp', [new Error('logged error')])).toMatch('logged error'); // error
    });

});
