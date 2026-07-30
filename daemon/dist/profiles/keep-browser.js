"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldKeepBrowserOnSessionEnd = shouldKeepBrowserOnSessionEnd;
exports.applyKeepBrowserPreference = applyKeepBrowserPreference;
/** Session-end kill is skipped unless the extension explicitly opts out (false). */
function shouldKeepBrowserOnSessionEnd(conn) {
    return conn?.keepBrowserOnSessionEnd !== false;
}
function applyKeepBrowserPreference(conn, value) {
    if (typeof value === 'boolean') {
        conn.keepBrowserOnSessionEnd = value;
    }
    // non-boolean / missing: leave existing (already defaulted true on create)
}
//# sourceMappingURL=keep-browser.js.map