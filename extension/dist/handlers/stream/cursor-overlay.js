const DEFAULT_RIPPLE_TTL_MS = 400;
const CURSOR_SIZE = 12;
const RIPPLE_MAX_RADIUS = 24;
export function applyMouseMove(state, x, y, now) {
    state.cursor = { x, y, ts: now };
}
export function applyMouseDown(state, x, y, now) {
    state.ripples.push({ x, y, born: now });
}
export function pruneRipples(ripples, now, ttlMs = DEFAULT_RIPPLE_TTL_MS) {
    return ripples.filter((ripple) => now - ripple.born < ttlMs);
}
function drawCursor(ctx, x, y) {
    const size = CURSOR_SIZE;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x + size * 0.75, y + size * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}
function drawRipple(ctx, ripple, now) {
    const age = now - ripple.born;
    const progress = Math.min(age / DEFAULT_RIPPLE_TTL_MS, 1);
    const radius = progress * RIPPLE_MAX_RADIUS;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}
export function drawCursorOverlay(ctx, cursor, ripples, now) {
    for (const ripple of ripples) {
        drawRipple(ctx, ripple, now);
    }
    if (cursor) {
        drawCursor(ctx, cursor.x, cursor.y);
    }
}
