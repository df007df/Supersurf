import { setLivePreviewStreamActive } from './live-preview-active.js';
/**
 * Single-flight live-preview stream session.
 * Overlapping start/stop RPCs serialize on a private queue.
 * Duplicate start → stop then start. Concurrent streams: one at a time.
 */
export class StreamSession {
    deps;
    active = false;
    tabId = null;
    stream = null;
    /** Serializes overlapping start/stop so both cannot observe idle and capture. */
    queue = Promise.resolve();
    constructor(deps) {
        this.deps = deps;
    }
    get activeTabId() {
        return this.tabId;
    }
    isActive() {
        return this.active;
    }
    enqueue(fn) {
        const run = this.queue.then(fn, fn);
        this.queue = run.then(() => undefined, () => undefined);
        return run;
    }
    /**
     * Always teardown Offscreen (closeDocument) even when in-memory session is idle.
     * Required after SW restart when Offscreen/tabCapture may still be alive.
     */
    async stopUnlocked() {
        try {
            await this.deps.teardown();
        }
        finally {
            this.active = false;
            this.tabId = null;
            this.stream = null;
            await setLivePreviewStreamActive(false);
        }
        return { ok: true };
    }
    async startUnlocked(params) {
        // Always close any prior / orphaned Offscreen before creating a new session.
        await this.stopUnlocked();
        await this.deps.ensureOffscreen();
        try {
            const captured = await this.deps.captureTab(params.tabId);
            this.stream = captured.stream;
            this.tabId = params.tabId;
            this.active = true;
            await setLivePreviewStreamActive(true);
            return { ok: true, tabId: params.tabId };
        }
        catch (err) {
            // captureTab can fail after ensureOffscreen (e.g. chrome://) — don't leak Offscreen.
            await this.deps.teardown();
            this.active = false;
            this.tabId = null;
            this.stream = null;
            await setLivePreviewStreamActive(false);
            throw err;
        }
    }
    async start(params) {
        return this.enqueue(() => this.startUnlocked(params));
    }
    async stop() {
        return this.enqueue(() => this.stopUnlocked());
    }
    async acceptOfferUnlocked(params) {
        if (!this.active || this.stream == null) {
            throw new Error('No active live preview stream. Call browseStreamStart first.');
        }
        return this.deps.answerOffer(params, this.stream);
    }
    async acceptOffer(params) {
        return this.enqueue(() => this.acceptOfferUnlocked(params));
    }
}
