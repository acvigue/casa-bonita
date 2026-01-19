import { getEffectiveUserId, requireAuth } from '../../../../utils/auth'
import { stringifyJsonField, transformRoomEntity } from '../../../../utils/json'
import { usePrisma } from '../../../../utils/prisma'



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
  const room = await prisma.room.findFirst({
    where: { id: roomId, userId },
  })

  if (!room) {
    throw createError({
      statusCode: 404,
      message: 'Room not found',
    })
  }

  const body = await readBody(event)

  if (!body.entityId || typeof body.entityId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Entity ID is required',
    })
  }

  // Check if entity exists in cache (or create placeholder)
  let entity = await prisma.entity.findUnique({
    where: { id: body.entityId },
  })

  if (!entity) {
    // Create placeholder entity - will be populated by HA sync
    entity = await prisma.entity.create({
      data: {
        id: body.entityId,
        state: 'unknown',
        attributes: '{}',
        lastChanged: new Date(),
        lastUpdated: new Date(),
      },
    })
  }

  // Get max sort order for this room
  const maxSortOrder = await prisma.roomEntity.aggregate({
    where: { roomId },
    _max: { sortOrder: true },
  })

  const roomEntity = await prisma.roomEntity.create({
    data: {
      roomId,
      entityId: body.entityId,
      displayName: body.displayName || null,
      icon: body.icon || null,
      hidden: body.hidden || false,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      widgetType: body.widgetType || 'default',
      widgetConfig: stringifyJsonField(body.widgetConfig),
      gridX: body.gridX || 0,
      gridY: body.gridY || 0,
      gridWidth: body.gridWidth || 1,
      gridHeight: body.gridHeight || 1,
    },
    include: {
      entity: true,
    },
  })

  return transformRoomEntity(roomEntity)
})
