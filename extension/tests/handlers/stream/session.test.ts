import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StreamSession } from '../../../src/handlers/stream/session'
import { isLivePreviewStreamActive } from '../../../src/handlers/stream/live-preview-active'

describe('StreamSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('stop is idempotent when idle but still teardowns Offscreen', async () => {
    const teardown = vi.fn()
    const s = new StreamSession({
      ensureOffscreen: vi.fn(),
      captureTab: vi.fn(),
      answerOffer: vi.fn(),
      teardown,
    })
    await expect(s.stop()).resolves.toEqual({ ok: true })
    expect(teardown).toHaveBeenCalledTimes(1)
    expect(isLivePreviewStreamActive()).toBe(false)
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
    // start always stopUnlocked first; idle start also teardowns once → 2 teardowns for 2 starts
    expect(teardown).toHaveBeenCalled()
    expect(captureTab).toHaveBeenLastCalledWith(2)
    expect(s.activeTabId).toBe(2)
  })

  it('serializes concurrent start calls (second waits for first)', async () => {
    let captureInFlight = 0
    let maxConcurrent = 0
    const gates: Array<{ tabId: number; release: () => void }> = []

    const captureTab = vi.fn().mockImplementation(async (tabId: number) => {
      captureInFlight++
      maxConcurrent = Math.max(maxConcurrent, captureInFlight)
      await new Promise<void>((resolve) => {
        gates.push({ tabId, release: resolve })
      })
      captureInFlight--
      return { stream: { tabId } }
    })

    const s = new StreamSession({
      ensureOffscreen: vi.fn(),
      captureTab,
      answerOffer: vi.fn(),
      teardown: vi.fn(),
    })

    const p1 = s.start({ tabId: 1 })
    const p2 = s.start({ tabId: 2 })

    // Wait until first capture is blocked inside the mutex
    await vi.waitFor(() => {
      expect(gates.length).toBe(1)
      expect(gates[0].tabId).toBe(1)
    })
    expect(captureTab).toHaveBeenCalledTimes(1)
    expect(maxConcurrent).toBe(1)

    gates.shift()!.release()

    await vi.waitFor(() => {
      expect(gates.length).toBe(1)
      expect(gates[0].tabId).toBe(2)
    })
    expect(maxConcurrent).toBe(1)

    gates.shift()!.release()

    await expect(p1).resolves.toEqual({ ok: true, tabId: 1 })
    await expect(p2).resolves.toEqual({ ok: true, tabId: 2 })
    expect(maxConcurrent).toBe(1)
    expect(s.activeTabId).toBe(2)
    expect(isLivePreviewStreamActive()).toBe(true)
  })

  it('idle stop after SW-restart-like state still calls teardown', async () => {
    const teardown = vi.fn()
    const s = new StreamSession({
      ensureOffscreen: vi.fn(),
      captureTab: vi.fn(),
      answerOffer: vi.fn(),
      teardown,
    })
    // Simulate orphan: in-memory idle, but stop must still close Offscreen
    expect(s.isActive()).toBe(false)
    await s.stop()
    expect(teardown).toHaveBeenCalledTimes(1)
  })
})
