/** Persisted so Stop still tears down Offscreen after an MV3 SW restart. */
export const LIVE_PREVIEW_ACTIVE_KEY = 'livePreviewActive';
let streamActive = false;
export function isLivePreviewStreamActive() {
    return streamActive;
}
function sessionStorage() {
    try {
        return chrome?.storage?.session;
    }
    catch {
        return undefined;
    }
}
/** Task 3 toggles when a StreamSession starts/stops. Persists to chrome.storage.session. */
export async function setLivePreviewStreamActive(active) {
    streamActive = active;
    const storage = sessionStorage();
    if (!storage)
        return;
    try {
        if (active) {
            await storage.set({ [LIVE_PREVIEW_ACTIVE_KEY]: true });
        }
        else {
            await storage.remove(LIVE_PREVIEW_ACTIVE_KEY);
        }
    }
    catch {
        // ignore — storage may be unavailable in tests / restricted contexts
    }
}
/** Rehydrate in-memory flag after service worker restart. */
export async function rehydrateLivePreviewStreamActive() {
    const storage = sessionStorage();
    if (!storage) {
        streamActive = false;
        return false;
    }
    try {
        const result = await storage.get(LIVE_PREVIEW_ACTIVE_KEY);
        streamActive = Boolean(result?.[LIVE_PREVIEW_ACTIVE_KEY]);
    }
    catch {
        streamActive = false;
    }
    return streamActive;
}
