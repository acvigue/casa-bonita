import { getEffectiveUserId, requireAuth } from '../../utils/auth'
import { usePrisma } from '../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAuth(event)
  const userId = getEffectiveUserId(event)

  const roomId = getRouterParam(event, 'id')

  if (!roomId) {
    throw createError({
      statusCode: 400,
      message: 'Room ID is required',
    })
  }

  // Verify room belongs to user
  const existingRoom = await prisma.room.findFirst({
    where: { id: roomId, userId },
  })

  if (!existingRoom) {
    throw createError({
      statusCode: 404,
      message: 'Room not found',
    })
  }

  await prisma.room.delete({
    where: { id: roomId },
  })

  return { success: true }
})
