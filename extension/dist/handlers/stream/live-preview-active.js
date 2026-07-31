let streamActive = false;
export function isLivePreviewStreamActive() {
    return streamActive;
}
/** Task 3 toggles when a StreamSession starts/stops. */
export function setLivePreviewStreamActive(active) {
    streamActive = active;
}
