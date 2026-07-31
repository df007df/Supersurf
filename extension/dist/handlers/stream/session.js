import { setLivePreviewStreamActive } from './live-preview-active.js';
/**
 * Single-flight live-preview stream session.
 * Duplicate start → stop then start. Concurrent streams: one at a time.
 */
export class StreamSession {
    deps;
    active = false;
    tabId = null;
    stream = null;
    constructor(deps) {
        this.deps = deps;
    }
    get activeTabId() {
        return this.tabId;
    }
    isActive() {
        return this.active;
    }
    async start(params) {
        if (this.active) {
            await this.stop();
        }
        await this.deps.ensureOffscreen();
        const captured = await this.deps.captureTab(params.tabId);
        this.stream = captured.stream;
        this.tabId = params.tabId;
        this.active = true;
        setLivePreviewStreamActive(true);
        return { ok: true, tabId: params.tabId };
    }
    async stop() {
        if (!this.active) {
            return { ok: true };
        }
        try {
            await this.deps.teardown();
        }
        finally {
            this.active = false;
            this.tabId = null;
            this.stream = null;
            setLivePreviewStreamActive(false);
        }
        return { ok: true };
    }
    async acceptOffer(params) {
        if (!this.active || this.stream == null) {
            throw new Error('No active live preview stream. Call browseStreamStart first.');
        }
        return this.deps.answerOffer(params, this.stream);
    }
}
