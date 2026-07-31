import {
  applyMouseDown,
  applyMouseMove,
  drawCursorOverlay,
  pruneRipples,
  type CursorPoint,
  type Ripple,
} from './cursor-overlay.js'

const TARGET_FPS = 30

export type CompositorHandle = {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  cursor: CursorPoint | null
  ripples: Ripple[]
  rafId: number | null
  compositeStream: MediaStream | null
  tabStream: MediaStream | null
}

/**
 * Bind a tab MediaStream to a hidden video + canvas compositor.
 * Cursor/ripples are drawn only on this canvas (never page DOM).
 */
export function createCompositor(
  tabStream: MediaStream,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): CompositorHandle {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get 2d context for live preview compositor')
  }

  video.srcObject = tabStream
  video.muted = true
  video.playsInline = true

  return {
    video,
    canvas,
    ctx,
    cursor: null,
    ripples: [],
    rafId: null,
    compositeStream: null,
    tabStream,
  }
}

function resizeCanvasToVideo(handle: CompositorHandle): void {
  const { video, canvas } = handle
  const w = video.videoWidth || 1280
  const h = video.videoHeight || 720
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
}

function paintFrame(handle: CompositorHandle): void {
  const { ctx, video, canvas } = handle
  resizeCanvasToVideo(handle)
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const now = performance.now()
  handle.ripples = pruneRipples(handle.ripples, now)
  drawCursorOverlay(ctx, handle.cursor, handle.ripples, now)
}

function loop(handle: CompositorHandle): void {
  paintFrame(handle)
  handle.rafId = requestAnimationFrame(() => loop(handle))
}

/** Start the composite loop and return canvas.captureStream at ~30fps. */
export async function startCompositing(handle: CompositorHandle): Promise<MediaStream> {
  try {
    await handle.video.play()
  } catch {
    // Autoplay can fail if not muted; we mute above — ignore residual failures.
  }

  // Wait briefly for first frame dimensions when available
  if (!handle.video.videoWidth) {
    await new Promise<void>((resolve) => {
      const onMeta = () => {
        handle.video.removeEventListener('loadedmetadata', onMeta)
        resolve()
      }
      handle.video.addEventListener('loadedmetadata', onMeta)
      setTimeout(resolve, 500)
    })
  }

  resizeCanvasToVideo(handle)
  if (handle.rafId == null) {
    loop(handle)
  }

  if (!handle.compositeStream) {
    handle.compositeStream = handle.canvas.captureStream(TARGET_FPS)
  }
  return handle.compositeStream
}

export function applyCompositorMouse(
  handle: CompositorHandle,
  kind: 'move' | 'down',
  x: number,
  y: number,
): void {
  const now = performance.now()
  if (kind === 'move') {
    applyMouseMove(handle, x, y, now)
  } else {
    applyMouseDown(handle, x, y, now)
  }
}

export function stopCompositing(handle: CompositorHandle): void {
  if (handle.rafId != null) {
    cancelAnimationFrame(handle.rafId)
    handle.rafId = null
  }
  if (handle.compositeStream) {
    for (const track of handle.compositeStream.getTracks()) {
      track.stop()
    }
    handle.compositeStream = null
  }
  if (handle.tabStream) {
    for (const track of handle.tabStream.getTracks()) {
      track.stop()
    }
    handle.tabStream = null
  }
  handle.video.srcObject = null
  handle.cursor = null
  handle.ripples = []
}
