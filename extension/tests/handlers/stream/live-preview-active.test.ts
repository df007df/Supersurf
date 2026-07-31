import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  LIVE_PREVIEW_ACTIVE_KEY,
  isLivePreviewStreamActive,
  rehydrateLivePreviewStreamActive,
  setLivePreviewStreamActive,
} from '../../../src/handlers/stream/live-preview-active'

describe('live-preview-active persistence', () => {
  let store: Record<string, unknown>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('chrome', {
      storage: {
        session: {
          get: vi.fn(async (key: string) =>
            key in store ? { [key]: store[key] } : {},
          ),
          set: vi.fn(async (obj: Record<string, unknown>) => {
            Object.assign(store, obj)
          }),
          remove: vi.fn(async (key: string) => {
            delete store[key]
          }),
        },
      },
    })
  })

  it('persists livePreviewActive on set and clears on false', async () => {
    await setLivePreviewStreamActive(true)
    expect(isLivePreviewStreamActive()).toBe(true)
    expect(store[LIVE_PREVIEW_ACTIVE_KEY]).toBe(true)

    await setLivePreviewStreamActive(false)
    expect(isLivePreviewStreamActive()).toBe(false)
    expect(store[LIVE_PREVIEW_ACTIVE_KEY]).toBeUndefined()
  })

  it('rehydrates flag from chrome.storage.session after SW restart', async () => {
    // SW restart: in-memory flag is false; session storage still has the key.
    await setLivePreviewStreamActive(false)
    store[LIVE_PREVIEW_ACTIVE_KEY] = true

    const active = await rehydrateLivePreviewStreamActive()
    expect(active).toBe(true)
    expect(isLivePreviewStreamActive()).toBe(true)
  })
})

