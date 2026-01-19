import { requireAdmin } from '../../../../../utils/auth'
import { usePrisma } from '../../../../../utils/prisma'
import { syncUserConfiguration } from '../../../../../utils/userService'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAdmin(event)

  const targetUserId = getRouterParam(event, 'id')

  if (!targetUserId) {
    throw createError({
      statusCode: 400,
      message: 'Target user ID is required',
    })
  }

  const body = await readBody(event)

  if (!body.sourceUserId || typeof body.sourceUserId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Source user ID is required',
    })
  }

  // Verify both users exist
  const [sourceUser, targetUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: body.sourceUserId } }),
    prisma.user.findUnique({ where: { id: targetUserId } }),
  ])

  if (!sourceUser) {
    throw createError({
      statusCode: 404,
      message: 'Source user not found',
    })
  }

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: 'Target user not found',
    })
  }

  await syncUserConfiguration(body.sourceUserId, targetUserId, {
    includeRooms: body.includeRooms !== false,
    includePreferences: body.includePreferences !== false,
    replaceExisting: body.replaceExisting === true,
  })

  return { success: true }
})
