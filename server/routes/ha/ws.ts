import { jwtVerify } from 'jose'
import { getHAProxyConfig } from '../../utils/homeassistant/proxy'

// Parse cookies from header string
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    if (name) {
      cookies[name] = rest.join('=')
    }
  })
  return cookies
}

export default defineWebSocketHandler({
  async upgrade(request) {
    // Authentication check during upgrade
    const cookieHeader = request.headers.get('cookie') || ''
    const cookies = parseCookies(cookieHeader)
    const token = cookies.casa_auth

    if (!token) {
      return new Response('Unauthorized', { status: 401 })
    }

    const config = useRuntimeConfig()
    if (!config.jwtSecret) {
      return new Response('Server misconfigured', { status: 500 })
    }

    try {
      const secretKey = new TextEncoder().encode(config.jwtSecret)
      await jwtVerify(token, secretKey)
      // Auth valid - allow upgrade by returning undefined
    }
    catch {
      return new Response('Invalid token', { status: 401 })
    }
  },

  open(peer) {
    const haConfig = getHAProxyConfig()

    // Create upstream WebSocket to Home Assistant
    const haWs = new WebSocket(haConfig.wsUrl)

    // Store HA connection on the peer context
    peer.ctx.haWs = haWs
    peer.ctx.haConfig = haConfig
    peer.ctx.authenticated = false

    haWs.onopen = () => {
      // HA will send auth_required, we wait for it
      console.log('[ha-ws-proxy] Connected to Home Assistant WebSocket')
    }

    haWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string)

        // Handle HA authentication flow
        if (message.type === 'auth_required') {
          // Send our token to HA
          haWs.send(JSON.stringify({
            type: 'auth',
            access_token: haConfig.token,
          }))
          return
        }

        if (message.type === 'auth_ok') {
          peer.ctx.authenticated = true
          // Forward auth_ok to client (they can use this to know connection is ready)
          peer.send(JSON.stringify({ type: 'auth_ok', ha_version: message.ha_version }))
          return
        }

        if (message.type === 'auth_invalid') {
          peer.send(JSON.stringify({ type: 'auth_invalid', message: message.message }))
          peer.close(1008, 'HA authentication failed')
          return
        }

        // Forward all other messages to client
        peer.send(event.data as string)
      }
      catch (error) {
        console.error('[ha-ws-proxy] Error parsing HA message:', error)
      }
    }

    haWs.onerror = (error) => {
      console.error('[ha-ws-proxy] HA connection error:', error)
      peer.close(1011, 'Upstream error')
    }

    haWs.onclose = (event) => {
      console.log('[ha-ws-proxy] HA connection closed:', event.code, event.reason)
      peer.close(event.code, event.reason || 'HA connection closed')
    }
  },

  message(peer, message) {
    const haWs = peer.ctx.haWs as WebSocket

    if (!haWs || haWs.readyState !== WebSocket.OPEN) {
      peer.send(JSON.stringify({ type: 'error', message: 'HA not connected' }))
      return
    }

    // Forward client message to HA
    const data = message.text()
    haWs.send(data)
  },

  close(peer, details) {
    console.log('[ha-ws-proxy] Client disconnected:', details.code, details.reason)
    const haWs = peer.ctx.haWs as WebSocket
    if (haWs) {
      haWs.close()
    }
  },

  error(peer, error) {
    console.error('[ha-ws-proxy] Peer error:', error)
    const haWs = peer.ctx.haWs as WebSocket
    if (haWs) {
      haWs.close()
    }
  },
})
