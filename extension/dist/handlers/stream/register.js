/**
 * Register browseStreamStart / browseStreamStop / browseStreamOffer on the WS bridge.
 */
export function registerStreamHandlers(ws, deps) {
    ws.registerCommandHandler('browseStreamStart', async (params) => {
        const { tabId } = await deps.ensureTab(params?.tabId);
        await deps.session.start({ tabId });
        return { ok: true, tabId };
    });
    ws.registerCommandHandler('browseStreamStop', async () => {
        await deps.session.stop();
        return { ok: true };
    });
    ws.registerCommandHandler('browseStreamOffer', async (params) => {
        return deps.session.acceptOffer(params);
    });
}
