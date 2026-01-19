import { SignJWT } from 'jose'
import { ensureUser } from '../../utils/userService'

export default defineEventHandler(async (event) => {
  // ONLY allow in development
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 404,
      message: 'Not found',
    })
  }

  const config = useRuntimeConfig()
  const jwtSecret = config.jwtSecret

  if (!jwtSecret) {
    throw createError({
      statusCode: 500,
      message: 'JWT secret not configured. Set JWT_SECRET in .env',
    })
  }

  // Create a dev admin user
  const devUserId = 'dev-admin'
  const devUserName = 'Dev Admin'

  await ensureUser(devUserId, devUserName, true)

  const secretKey = new TextEncoder().encode(jwtSecret)

  const token = await new SignJWT({
    name: devUserName,
    isAdmin: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(devUserId)
    .setIssuedAt()
    .setExpirationTime('7d') // Longer expiry for dev
    .sign(secretKey)

  setCookie(event, 'casa_auth', token, {
    httpOnly: true,
    secure: false, // Dev mode
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return {
    user: {
      id: devUserId,
      displayName: devUserName,
      isAdmin: true,
    },
    message: 'Dev login successful',
  }
})
