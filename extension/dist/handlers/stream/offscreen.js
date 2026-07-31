/**
 * Offscreen Document entry for live tab preview.
 * Owns tabCapture getUserMedia, canvas compositor (cursor overlay), and WebRTC answer PC.
 */
import { applyCompositorMouse, createCompositor, startCompositing, stopCompositing, } from './compositor.js';
import { answerOffer } from './webrtc-session.js';
let compositor = null;
let peerConnection = null;
let activeTabId = null;
async function captureFromStreamId(streamId, tabId) {
    await teardownCapture();
    let tabStream;
    try {
        tabStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                // Chrome tab capture constraint (not in standard MediaTrackConstraints)
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId,
                },
            },
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`tabCapture denied or unavailable: ${msg}`);
    }
    const video = document.getElementById('tab-video');
    const canvas = document.getElementById('composite');
    if (!video || !canvas) {
        for (const track of tabStream.getTracks())
            track.stop();
        throw new Error('Offscreen compositor DOM missing (video/canvas)');
    }
    compositor = createCompositor(tabStream, video, canvas);
    await startCompositing(compositor);
    activeTabId = tabId;
}
async function handleOffer(sdp) {
    if (!compositor?.compositeStream) {
        throw new Error('No active composite stream. Call browseStreamStart first.');
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    const result = await answerOffer(compositor.compositeStream, sdp);
    peerConnection = result.pc;
    return { sdp: result.sdp, type: 'answer' };
}
async function teardownCapture() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (compositor) {
        stopCompositing(compositor);
        compositor = null;
    }
    activeTabId = null;
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object')
        return false;
    const respond = (payload) => {
        sendResponse?.(payload);
    };
    if (message.type === 'livePreviewMouse') {
        // Cursor optional: missing content-script → stream still works without cursor
        if (compositor && message.tabId === activeTabId) {
            const kind = message.kind === 'down' ? 'down' : 'move';
            applyCompositorMouse(compositor, kind, Number(message.x) || 0, Number(message.y) || 0);
        }
        return false;
    }
    if (message.type === 'livePreviewCapture') {
        void captureFromStreamId(String(message.streamId), Number(message.tabId))
            .then(() => respond({ ok: true }))
            .catch((err) => {
            const error = err instanceof Error ? err.message : String(err);
            respond({ ok: false, error });
        });
        return true;
    }
    if (message.type === 'livePreviewOffer') {
        void handleOffer(String(message.sdp))
            .then((answer) => respond(answer))
            .catch((err) => {
            const error = err instanceof Error ? err.message : String(err);
            respond({ error });
        });
        return true;
    }
    if (message.type === 'livePreviewTeardown') {
        void teardownCapture()
            .then(() => respond({ ok: true }))
            .catch((err) => {
            const error = err instanceof Error ? err.message : String(err);
            respond({ ok: false, error });
        });
        return true;
    }
    return false;
});
