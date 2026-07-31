import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StreamSession } from '../../../src/handlers/stream/session'

describe('StreamSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('stop is idempotent when idle', async () => {
    const s = new StreamSession({
      ensureOffscreen: vi.fn(),
      captureTab: vi.fn(),
      answerOffer: vi.fn(),
      teardown: vi.fn(),
    })
    await expect(s.stop()).resolves.toEqual({ ok: true })
  })

  it('second start stops the first', async () => {
    const teardown = vi.fn()
    const captureTab = vi.fn().mockResolvedValue({ stream: {} })
    const s = new StreamSession({
      ensureOffscreen: vi.fn(),
      captureTab,
      answerOffer: vi.fn(),
      teardown,
    })
    await s.start({ tabId: 1 })
    await s.start({ tabId: 2 })
    expect(teardown).toHaveBeenCalled()
    expect(captureTab).toHaveBeenLastCalledWith(2)
  })
})
