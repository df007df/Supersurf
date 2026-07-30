import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { onScreenshot } from '../src/tools/screenshot';
import type { ToolContext } from '../src/tools/lib/types';

function createMockCtx(): ToolContext {
  return {
    tabId: 1,
    ext: { sendCmd: vi.fn() } as any,
    connectionManager: null,
    cdp: vi.fn().mockResolvedValue({}),
    eval: vi.fn().mockResolvedValue(undefined),
    sleep: vi.fn().mockResolvedValue(undefined),
    getElementCenter: vi.fn(),
    getSelectorExpression: vi.fn(),
    findAlternativeSelectors: vi.fn(),
    formatResult: vi.fn((_n, r) => ({ content: [{ type: 'text', text: JSON.stringify(r) }] })),
    error: vi.fn((msg) => ({ content: [{ type: 'text', text: msg }], isError: true })),
  };
}

async function tinyJpegBase64(): Promise<string> {
  const buf = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  return buf.toString('base64');
}

describe('onScreenshot()', () => {
  let ctx: ToolContext;
  let jpegB64: string;
  const written: string[] = [];

  beforeEach(async () => {
    ctx = createMockCtx();
    jpegB64 = await tinyJpegBase64();
    (ctx.ext.sendCmd as any).mockResolvedValue({ data: jpegB64, mimeType: 'image/jpeg' });
    written.length = 0;
  });

  afterEach(() => {
    for (const p of written) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  });

  it('defaults to a temp-dir path when path is omitted (no inline image)', async () => {
    const result = await onScreenshot(ctx, {}, {});

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toMatch(/Screenshot saved to /);
    expect(result.content.some((c: any) => c.type === 'image')).toBe(false);

    const match = result.content[0].text.match(/Screenshot saved to (.+?) \(/);
    expect(match).toBeTruthy();
    const savedPath = match![1];
    written.push(savedPath);

    expect(savedPath.startsWith(path.join(os.tmpdir(), 'supersurf-screenshots'))).toBe(true);
    expect(fs.existsSync(savedPath)).toBe(true);
    expect(fs.statSync(savedPath).size).toBeGreaterThan(0);
  });

  it('uses the explicit path when provided', async () => {
    const home = os.homedir();
    const rel = path.join('.supersurf-test-screenshots', `explicit-${Date.now()}.jpg`);
    const expected = path.join(home, rel);
    fs.mkdirSync(path.dirname(expected), { recursive: true });
    written.push(expected);

    const result = await onScreenshot(ctx, { path: rel }, {});

    expect(result.content[0].text).toContain(`Screenshot saved to ${expected}`);
    expect(result.content.some((c: any) => c.type === 'image')).toBe(false);
    expect(fs.existsSync(expected)).toBe(true);
  });

  it('rawResult without path still returns inline base64 (internal capture)', async () => {
    const result = await onScreenshot(ctx, {}, { rawResult: true });

    expect(result.data).toBeTruthy();
    expect(typeof result.data).toBe('string');
    expect(result.mimeType).toMatch(/image\//);
    expect(result.path).toBeUndefined();
  });
});
