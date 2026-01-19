import { getEffectiveUserId, requireAuth } from '../../../../utils/auth'
import { usePrisma } from '../../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAuth(event)
  const userId = getEffectiveUserId(event)

  const roomId = getRouterParam(event, 'id')
  const entityId = getRouterParam(event, 'entityId')

  if (!roomId || !entityId) {
    throw createError({
      statusCode: 400,
      message: 'Room ID and Entity ID are required',
    })
  }

  // Verify room belongs to user
  const room = await prisma.room.findFirst({
    where: { id: roomId, userId },
  })

  if (!room) {
    throw createError({
      statusCode: 404,
      message: 'Room not found',
    })
  }

  // Find and delete the room entity
  const existingRoomEntity = await prisma.roomEntity.findUnique({
    where: { roomId_entityId: { roomId, entityId } },
  })

  if (!existingRoomEntity) {
    throw createError({
      statusCode: 404,
      message: 'Entity not found in room',
    })
  }

  await prisma.roomEntity.delete({
    where: { roomId_entityId: { roomId, entityId } },
  })

  return { success: true }
})
