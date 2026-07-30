/**
 * Screenshot and PDF tool handlers.
 *
 * Implements `browser_take_screenshot` and `browser_pdf_save`.
 *
 * Screenshots are captured via the extension's CDP Page.captureScreenshot.
 * Agent-facing calls always save to disk (explicit `path`, or a temp file under
 * `$TMPDIR/supersurf-screenshots/`) and return text only — avoiding base64
 * image blocks that blow up model context. Internal `rawResult` captures with
 * no path still return inline base64 (used by maybeAppendScreenshot).
 *
 * Supports: format selection, quality, full-page, element crop via selector,
 * coordinate clipping, device scale, and clickable element highlighting.
 *
 * @module tools/screenshot
 */
import type { ToolContext } from './lib/types';
/** Build a unique temp path under `$TMPDIR/supersurf-screenshots/`. */
export declare function defaultTempScreenshotPath(format?: string): string;
/**
 * Capture a screenshot of the current page or a specific element/region.
 *
 * When saving to a file path, the original resolution is preserved.
 * Agent-facing calls without `path` default to a temp file (text-only result).
 * Internal `rawResult` without `path` still returns downscaled base64.
 *
 * @param args - Screenshot options (type, quality, fullPage, path, clip, selector, etc.)
 */
export declare function onScreenshot(ctx: ToolContext, args: any, options: any): Promise<any>;
/**
 * Export the current page as a PDF using CDP Page.printToPDF.
 *
 * @param args - `{ path?: string }` — file path for output
 */
export declare function onPdfSave(ctx: ToolContext, args: any, options: any): Promise<any>;
//# sourceMappingURL=screenshot.d.ts.map