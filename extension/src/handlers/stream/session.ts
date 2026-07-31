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
 * Duplicate start → stop then start. Concurrent streams: one at a time.
 */
export class StreamSession {
  private active = false
  private tabId: number | null = null
  private stream: unknown = null

  constructor(private readonly deps: StreamSessionDeps) {}

  get activeTabId(): number | null {
    return this.tabId
  }

  isActive(): boolean {
    return this.active
  }

  async start(params: { tabId: number }): Promise<{ ok: true; tabId: number }> {
    if (this.active) {
      await this.stop()
    }

    await this.deps.ensureOffscreen()
    const captured = await this.deps.captureTab(params.tabId)
    this.stream = captured.stream
    this.tabId = params.tabId
    this.active = true
    setLivePreviewStreamActive(true)
    return { ok: true, tabId: params.tabId }
  }

  async stop(): Promise<{ ok: true }> {
    if (!this.active) {
      return { ok: true }
    }

    try {
      await this.deps.teardown()
    } finally {
      this.active = false
      this.tabId = null
      this.stream = null
      setLivePreviewStreamActive(false)
    }
    return { ok: true }
  }

  async acceptOffer(params: {
    sdp: string
    type: 'offer'
  }): Promise<{ sdp: string; type: 'answer' }> {
    if (!this.active || this.stream == null) {
      throw new Error('No active live preview stream. Call browseStreamStart first.')
    }
    return this.deps.answerOffer(params, this.stream)
  }
}
