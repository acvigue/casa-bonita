import type { H3Event } from 'h3'

export interface AuthUser {
  id: string
  displayName: string
  isAdmin: boolean
  source: 'ingress' | 'jwt'
}

declare module 'h3' {
  interface H3EventContext {
    auth?: AuthUser
    ingressPath?: string
  }
}

export function requireAuth(event: H3Event): AuthUser {
  const auth = event.context.auth

  if (!auth) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  return auth
}

export function requireAdmin(event: H3Event): AuthUser {
  const auth = requireAuth(event)

  if (!auth.isAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Admin privileges required',
    })
  }

  return auth
}

export function getEffectiveUserId(event: H3Event): string {
  const auth = requireAuth(event)

  // Check for impersonation header (admin only)
  const impersonateUserId = getHeader(event, 'x-impersonate-user')
  if (impersonateUserId && auth.isAdmin) {
    return impersonateUserId
  }

  return auth.id
}
