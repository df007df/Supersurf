export function cssPointFromMouseEvent(ev: { clientX: number; clientY: number }): { x: number; y: number } {
  return { x: ev.clientX, y: ev.clientY }
}
