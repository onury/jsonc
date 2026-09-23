// own modules
import { jsonc } from './jsonc.js';
import { jsoncSafe } from './jsonc.safe.js';

jsonc.safe = jsoncSafe;
jsonc.jsonc = jsonc;

export * from './types.js';
export { jsonc, jsoncSafe as safe };
export default jsonc;
// `require('jsonc')` (Node.js require(esm)) returns `jsonc` itself, as in v2.
export { jsonc as 'module.exports' };
