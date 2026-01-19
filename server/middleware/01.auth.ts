import { jwtVerify } from 'jose'
import type { AuthUser } from '../utils/auth'

// Home Assistant Supervisor proxy IP
const SUPERVISOR_IPS = ['172.30.32.2', '172.30.33.1']

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jwtSecret = config.jwtSecret

  // Get client IP - check various headers for proxy scenarios
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const realIp = getHeader(event, 'x-real-ip')
  const clientIP = forwardedFor?.split(',')[0]?.trim() || realIp || ''

  // Check for ingress headers from Home Assistant Supervisor
  const hassUserId = getHeader(event, 'x-hass-user-id')
  const hassIsAdmin = getHeader(event, 'x-hass-is-admin')
  const ingressPath = getHeader(event, 'x-ingress-path')

  // If coming from Supervisor with user headers, trust them
  if (SUPERVISOR_IPS.includes(clientIP) && hassUserId) {
    const auth: AuthUser = {
      id: hassUserId,
      displayName: getHeader(event, 'x-hass-user-name') || 'Unknown User',
      isAdmin: hassIsAdmin === 'true',
      source: 'ingress',
    }

    event.context.auth = auth
    event.context.ingressPath = ingressPath || undefined
    return
  }

  // Also allow ingress headers when accessed locally (for development/direct access)
  // In production, you may want to be stricter about this
  if (hassUserId && process.env.NODE_ENV !== 'production') {
    const auth: AuthUser = {
      id: hassUserId,
      displayName: getHeader(event, 'x-hass-user-name') || 'Unknown User',
      isAdmin: hassIsAdmin === 'true',
      source: 'ingress',
    }

    event.context.auth = auth
    event.context.ingressPath = ingressPath || undefined
    return
  }

  // Check for JWT cookie
  const token = getCookie(event, 'casa_auth')
  if (token && jwtSecret) {
    try {
      const secretKey = new TextEncoder().encode(jwtSecret)
      const { payload } = await jwtVerify(token, secretKey)

      const auth: AuthUser = {
        id: payload.sub as string,
        displayName: payload.name as string,
        isAdmin: payload.isAdmin as boolean,
        source: 'jwt',
      }

      event.context.auth = auth
      return
    }
    catch {
      // Token invalid or expired - clear it
      deleteCookie(event, 'casa_auth')
    }
  }

  // No auth - routes must handle unauthenticated requests
  event.context.auth = undefined
})
