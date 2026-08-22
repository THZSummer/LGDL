import { registerConverter } from './converters.js';
function toJson(doc) {
    return JSON.stringify(doc, null, 2);
}
// register side-effect
registerConverter('json', toJson);
