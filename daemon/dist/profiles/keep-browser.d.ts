/** Session-end kill is skipped unless the extension explicitly opts out (false). */
export declare function shouldKeepBrowserOnSessionEnd(conn: {
    keepBrowserOnSessionEnd?: boolean;
} | null | undefined): boolean;
export declare function applyKeepBrowserPreference(conn: {
    keepBrowserOnSessionEnd: boolean;
}, value: unknown): void;
//# sourceMappingURL=keep-browser.d.ts.map