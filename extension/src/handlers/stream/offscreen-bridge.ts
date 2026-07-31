/**
 * Background ↔ Offscreen messaging helpers for live preview capture / WebRTC.
 */

const OFFSCREEN_PATH = 'dist/handlers/stream/offscreen.html'
const OFFSCREEN_JUSTIFICATION = 'Live tab preview composite'

function sendMessageAsync<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: any) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'Extension message failed'))
        return
      }
      if (response?.error) {
        reject(new Error(String(response.error)))
        return
      }
      resolve(response as T)
    })
  })
}

export async function ensureOffscreenDocument(): Promise<void> {
  const offscreen = chrome.offscreen
  if (!offscreen) {
    throw new Error('chrome.offscreen API unavailable — cannot start live preview')
  }

  if (typeof offscreen.hasDocument === 'function') {
    const has = await offscreen.hasDocument()
    if (has) return
  }

  try {
    await offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ['USER_MEDIA', 'WEB_RTC'],
      justification: OFFSCREEN_JUSTIFICATION,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Concurrent createDocument races: treat "already exists" as success
    if (/already exists|Only a single offscreen/i.test(msg)) return
    throw err
  }
}

export async function closeOffscreenDocument(): Promise<void> {
  const offscreen = chrome.offscreen
  if (!offscreen) return
  try {
    if (typeof offscreen.hasDocument === 'function') {
      const has = await offscreen.hasDocument()
      if (!has) return
    }
    await offscreen.closeDocument()
  } catch {
    // ignore — already closed
  }
}

function assertCapturableUrl(url: string | undefined): void {
  if (!url) return
  const blocked =
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('devtools://')
  if (blocked) {
    throw new Error(
      `Cannot capture tab URL "${url}": privileged pages (chrome://, about:, extensions) are not capturable with tabCapture.`,
    )
  }
}

export async function captureTabInOffscreen(tabId: number): Promise<{ stream: true }> {
  const tab = await chrome.tabs.get(tabId)
  assertCapturableUrl(tab.url || tab.pendingUrl)

  let streamId: string
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`tabCapture denied or unavailable for tab ${tabId}: ${msg}`)
  }

  if (!streamId) {
    throw new Error(`tabCapture denied or unavailable for tab ${tabId}: empty stream id`)
  }

  await sendMessageAsync({ type: 'livePreviewCapture', streamId, tabId })
  // MediaStream lives in the Offscreen Document; background only tracks session state.
  return { stream: true }
}

export async function answerOfferInOffscreen(params: {
  sdp: string
  type: 'offer'
}): Promise<{ sdp: string; type: 'answer' }> {
  const result = await sendMessageAsync<{ sdp: string; type: 'answer' }>({
    type: 'livePreviewOffer',
    sdp: params.sdp,
  })
  if (!result?.sdp) {
    throw new Error('browseStreamOffer failed: empty answer SDP from offscreen')
  }
  return { sdp: result.sdp, type: 'answer' }
}

export async function teardownOffscreenCapture(): Promise<void> {
  try {
    await sendMessageAsync({ type: 'livePreviewTeardown' })
  } catch {
    // Offscreen may already be gone
  }
  await closeOffscreenDocument()
}
