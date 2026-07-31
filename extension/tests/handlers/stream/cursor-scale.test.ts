import { describe, it, expect } from 'vitest'
import { scaleCssPointToCapture } from '../../../src/handlers/stream/cursor-scale'

describe('scaleCssPointToCapture', () => {
  it('scales CSS coords by canvas/css ratio (DPR 2)', () => {
    expect(scaleCssPointToCapture(100, 50, 800, 600, 1600, 1200)).toEqual({
      x: 200,
      y: 100,
    })
  })

  it('is identity when css and capture sizes match', () => {
    expect(scaleCssPointToCapture(10, 20, 1280, 720, 1280, 720)).toEqual({
      x: 10,
      y: 20,
    })
  })

  it('falls back to 1x when css size is zero', () => {
    expect(scaleCssPointToCapture(10, 20, 0, 0, 1600, 1200)).toEqual({
      x: 10,
      y: 20,
    })
  })
})
