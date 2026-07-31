import { describe, it, expect, vi } from 'vitest'
import {
  applyMouseMove,
  applyMouseDown,
  pruneRipples,
  drawCursorOverlay,
} from '../../../src/handlers/stream/cursor-overlay'

describe('cursor-overlay', () => {
  it('stores latest cursor and adds ripple on mousedown', () => {
    const state = { cursor: null as null | { x: number; y: number; ts: number }, ripples: [] as { x: number; y: number; born: number }[] }
    applyMouseMove(state, 10, 20, 1000)
    expect(state.cursor).toEqual({ x: 10, y: 20, ts: 1000 })
    applyMouseDown(state, 10, 20, 1001)
    expect(state.ripples).toHaveLength(1)
  })

  it('prunes expired ripples', () => {
    const ripples = [{ x: 1, y: 2, born: 0 }]
    expect(pruneRipples(ripples, 500, 400)).toEqual([])
  })

  it('drawCursorOverlay calls canvas when cursor present', () => {
    const ctx = {
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D
    drawCursorOverlay(ctx, { x: 5, y: 6, ts: 1 }, [], 1)
    expect(ctx.beginPath).toHaveBeenCalled()
  })
})
