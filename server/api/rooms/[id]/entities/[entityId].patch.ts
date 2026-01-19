import { getEffectiveUserId, requireAuth } from '../../../../utils/auth'
import { stringifyJsonField, transformRoomEntity } from '../../../../utils/json'
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

  // Find the room entity
  const existingRoomEntity = await prisma.roomEntity.findUnique({
    where: { roomId_entityId: { roomId, entityId } },
  })

  if (!existingRoomEntity) {
    throw createError({
      statusCode: 404,
      message: 'Entity not found in room',
    })
  }

  const body = await readBody(event)

  // Validate allowed fields
  const allowedFields = [
    'displayName',
    'icon',
    'hidden',
    'sortOrder',
    'widgetType',
    'widgetConfig',
    'gridX',
    'gridY',
    'gridWidth',
    'gridHeight',
  ]

  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      if (field === 'widgetConfig') {
        updateData[field] = stringifyJsonField(body[field])
      }
      else {
        updateData[field] = body[field]
      }
    }
  }

  const roomEntity = await prisma.roomEntity.update({
    where: { roomId_entityId: { roomId, entityId } },
    data: updateData,
    include: {
      entity: true,
    },
  })

  return transformRoomEntity(roomEntity)
})
