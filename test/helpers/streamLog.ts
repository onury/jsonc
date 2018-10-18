// core modules
import * as path from 'path';

// dep modules
import * as fs from 'graceful-fs';
import * as mkdirp from 'mkdirp';
import rimraf from 'rimraf';

export const streamLog = (jsonc: any, logMethod: string, msgList: any[]) => {

    const tmpDir = path.join(__dirname, '..', 'tmp');
    mkdirp.sync(tmpDir);
    const fpath = path.join(tmpDir, 'log-test.txt');
    let writableStream: any = fs.createWriteStream(fpath);
    jsonc.config({
        stream: writableStream,
        streamErr: writableStream
    });

    return new Promise((resolve, reject) => {
        // eslint-disable-next-line prefer-const
        let readableStream;
        let data;

        function destroy(): void {
            try {
                if (readableStream) {
                    readableStream.removeAllListeners();
                    readableStream.close();
                    readableStream = null;
                }
                if (writableStream) {
                    writableStream.removeAllListeners();
                    writableStream.close();
                    writableStream = null;
                }
                rimraf.sync(tmpDir);
            } catch (err) { }
        }

        /* istanbul ignore next */
        function onError(err: Error): void {
            destroy();
            reject(err);
        }

        function onReadbleEnd(): void {
            destroy();
            setTimeout(() => resolve(data), 300);
        }

        function onWritableReady(): void {
            jsonc[logMethod](...msgList);
            readableStream = fs.createReadStream(fpath)
                .on('error', onError)
                .on('readable', () => {
                    let buffer;
                    // tslint:disable-next-line:no-conditional-assignment
                    while (buffer = readableStream.read()) {
                        data = buffer.toString();
                    }
                    readableStream.on('end', onReadbleEnd);
                });
        }

        // 'ready' event is introduced in Node.js v9.11.0 so we use 'open' event.
        writableStream
            .on('error', onError)
            .on('open', onWritableReady);
    });
};
