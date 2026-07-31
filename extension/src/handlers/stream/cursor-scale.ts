/**
 * Map CSS viewport mouse coords onto the tabCapture / canvas frame.
 * On retina, videoWidth (canvas) is typically CSS width × devicePixelRatio.
 */
export function scaleCssPointToCapture(
  x: number,
  y: number,
  cssWidth: number,
  cssHeight: number,
  captureWidth: number,
  captureHeight: number,
): { x: number; y: number } {
  const sx = cssWidth > 0 ? captureWidth / cssWidth : 1
  const sy = cssHeight > 0 ? captureHeight / cssHeight : 1
  return { x: x * sx, y: y * sy }
}
