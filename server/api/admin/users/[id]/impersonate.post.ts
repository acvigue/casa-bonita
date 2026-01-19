import { SignJWT } from 'jose'
import { requireAdmin } from '../../../../utils/auth'
import { usePrisma } from '../../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAdmin(event)

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required',
    })
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
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

  const secretKey = new TextEncoder().encode(jwtSecret)

  // Create impersonation JWT (shorter lived)
  const token = await new SignJWT({
    name: targetUser.displayName,
    isAdmin: targetUser.isAdmin,
    impersonatedBy: event.context.auth!.id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(targetUser.id)
    .setIssuedAt()
    .setExpirationTime('1h') // Shorter expiry for impersonation
    .sign(secretKey)

  // Set cookie
  setCookie(event, 'casa_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  })

  return {
    user: {
      id: targetUser.id,
      displayName: targetUser.displayName,
      isAdmin: targetUser.isAdmin,
    },
    impersonating: true,
  }
})
