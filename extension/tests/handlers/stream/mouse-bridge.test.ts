import { describe, it, expect } from 'vitest'
import { cssPointFromMouseEvent } from '../../../src/handlers/stream/mouse-bridge'

describe('mouse-bridge', () => {
  it('maps clientX/clientY to CSS viewport pixels', () => {
    expect(cssPointFromMouseEvent({ clientX: 3, clientY: 4 })).toEqual({ x: 3, y: 4 })
  })
})
