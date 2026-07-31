const ICE_GATHER_TIMEOUT_MS = 2000;
/** Wait until ICE gathering completes or timeout (~2s). Non-trickle SDP. */
export function waitIceComplete(pc, timeoutMs = ICE_GATHER_TIMEOUT_MS) {
    if (pc.iceGatheringState === 'complete') {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const done = () => {
            pc.removeEventListener('icegatheringstatechange', onChange);
            clearTimeout(timer);
            resolve();
        };
        const onChange = () => {
            if (pc.iceGatheringState === 'complete')
                done();
        };
        const timer = setTimeout(done, timeoutMs);
        pc.addEventListener('icegatheringstatechange', onChange);
    });
}
/**
 * Answer a WebRTC offer with the composite video stream (non-trickle ICE).
 * iceServers: [] — host candidates only for local MVP.
 */
export async function answerOffer(composite, offerSdp) {
    const pc = new RTCPeerConnection({ iceServers: [] });
    try {
        for (const track of composite.getVideoTracks()) {
            pc.addTrack(track, composite);
        }
        await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitIceComplete(pc);
        const local = pc.localDescription;
        if (!local?.sdp) {
            throw new Error('WebRTC answer failed: missing local SDP after ICE gather');
        }
        return { sdp: local.sdp, type: 'answer', pc };
    }
    catch (err) {
        pc.close();
        throw err;
    }
}
