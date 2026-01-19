import { getEffectiveUserId, requireAuth } from '../../utils/auth'
import { stringifyJsonField, transformRoom } from '../../utils/json'
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

  const body = await readBody(event)

  // Validate allowed fields
  const allowedFields = ['name', 'icon', 'color', 'sortOrder', 'layout']
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      if (field === 'layout') {
        updateData[field] = stringifyJsonField(body[field])
      }
      else {
        updateData[field] = body[field]
      }
    }
  }

  const room = await prisma.room.update({
    where: { id: roomId },
    data: updateData,
    include: {
      entities: {
        include: {
          entity: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  return transformRoom(room)
})
