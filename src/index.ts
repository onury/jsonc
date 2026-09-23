// own modules
import { jsonc } from './jsonc.js';
import { jsoncSafe } from './jsonc.safe.js';

jsonc.safe = jsoncSafe;

export * from './types.js';
export { jsonc, jsoncSafe as safe };
export default jsonc;
