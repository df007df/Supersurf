let streamActive = false

export function isLivePreviewStreamActive(): boolean {
  return streamActive
}

/** Task 3 toggles when a StreamSession starts/stops. */
export function setLivePreviewStreamActive(active: boolean): void {
  streamActive = active
}
