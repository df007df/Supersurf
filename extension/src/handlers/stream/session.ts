import { setLivePreviewStreamActive } from './live-preview-active.js'

export type StreamSessionDeps = {
  ensureOffscreen: () => Promise<void> | void
  captureTab: (tabId: number) => Promise<{ stream: unknown }>
  answerOffer: (
    params: { sdp: string; type: 'offer' },
    stream: unknown,
  ) => Promise<{ sdp: string; type: 'answer' }>
  teardown: () => Promise<void> | void
}

/**
 * Single-flight live-preview stream session.
 * Overlapping start/stop RPCs serialize on a private queue.
 * Duplicate start → stop then start. Concurrent streams: one at a time.
 */
export class StreamSession {
  private active = false
  private tabId: number | null = null
  private stream: unknown = null
  /** Serializes overlapping start/stop so both cannot observe idle and capture. */
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly deps: StreamSessionDeps) {}

  get activeTabId(): number | null {
    return this.tabId
  }

  isActive(): boolean {
    return this.active
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn)
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  /**
   * Always teardown Offscreen (closeDocument) even when in-memory session is idle.
   * Required after SW restart when Offscreen/tabCapture may still be alive.
   */
  private async stopUnlocked(): Promise<{ ok: true }> {
    try {
      await this.deps.teardown()
    } finally {
      this.active = false
      this.tabId = null
      this.stream = null
      await setLivePreviewStreamActive(false)
    }
    return { ok: true }
  }

  private async startUnlocked(params: { tabId: number }): Promise<{ ok: true; tabId: number }> {
    // Always close any prior / orphaned Offscreen before creating a new session.
    await this.stopUnlocked()

    await this.deps.ensureOffscreen()
    try {
      const captured = await this.deps.captureTab(params.tabId)
      this.stream = captured.stream
      this.tabId = params.tabId
      this.active = true
      await setLivePreviewStreamActive(true)
      return { ok: true, tabId: params.tabId }
    } catch (err) {
      // captureTab can fail after ensureOffscreen (e.g. chrome://) — don't leak Offscreen.
      await this.deps.teardown()
      this.active = false
      this.tabId = null
      this.stream = null
      await setLivePreviewStreamActive(false)
      throw err
    }
  }

  async start(params: { tabId: number }): Promise<{ ok: true; tabId: number }> {
    return this.enqueue(() => this.startUnlocked(params))
  }

  async stop(): Promise<{ ok: true }> {
    return this.enqueue(() => this.stopUnlocked())
  }

  private async acceptOfferUnlocked(params: {
    sdp: string
    type: 'offer'
  }): Promise<{ sdp: string; type: 'answer' }> {
    if (!this.active || this.stream == null) {
      throw new Error('No active live preview stream. Call browseStreamStart first.')
    }
    return this.deps.answerOffer(params, this.stream)
  }

  async acceptOffer(params: {
    sdp: string
    type: 'offer'
  }): Promise<{ sdp: string; type: 'answer' }> {
    return this.enqueue(() => this.acceptOfferUnlocked(params))
  }
}
