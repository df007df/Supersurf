import type { StreamSession } from './session.js'

export type StreamRegisterWs = {
  registerCommandHandler: (
    method: string,
    handler: (params: any) => Promise<any>,
  ) => void
}

export type StreamRegisterDeps = {
  session: StreamSession
  ensureTab: (tabId?: number) => Promise<{ tabId: number }>
}

/**
 * Register browseStreamStart / browseStreamStop / browseStreamOffer on the WS bridge.
 */
export function registerStreamHandlers(
  ws: StreamRegisterWs,
  deps: StreamRegisterDeps,
): void {
  ws.registerCommandHandler('browseStreamStart', async (params: { tabId?: number }) => {
    const { tabId } = await deps.ensureTab(params?.tabId)
    await deps.session.start({ tabId })
    return { ok: true, tabId }
  })

  ws.registerCommandHandler('browseStreamStop', async () => {
    await deps.session.stop()
    return { ok: true }
  })

  ws.registerCommandHandler(
    'browseStreamOffer',
    async (params: { sdp: string; type: 'offer' }) => {
      return deps.session.acceptOffer(params)
    },
  )
}
