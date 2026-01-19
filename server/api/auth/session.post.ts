import { SignJWT } from 'jose'
import { ensureUser } from '../../utils/userService'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth

  if (!auth || auth.source !== 'ingress') {
    throw createError({
      statusCode: 401,
      message: 'Authentication required via Home Assistant ingress',
    })
  }

  const config = useRuntimeConfig()
  const jwtSecret = config.jwtSecret

  if (!jwtSecret) {
    throw createError({
      statusCode: 500,
      message: 'JWT secret not configured',
    })
  }

  // Ensure user exists in database
  await ensureUser(auth.id, auth.displayName, auth.isAdmin)

  const secretKey = new TextEncoder().encode(jwtSecret)

  // Create JWT valid for 24 hours
  const token = await new SignJWT({
    name: auth.displayName,
    isAdmin: auth.isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(auth.id)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey)

  // Set HTTP-only cookie
  setCookie(event, 'casa_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })

  return {
    user: {
      id: auth.id,
      displayName: auth.displayName,
      isAdmin: auth.isAdmin,
    },
  }
})
