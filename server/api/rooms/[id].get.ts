import { getEffectiveUserId, requireAuth } from '../../utils/auth'
import { transformRoom } from '../../utils/json'
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

  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      userId,
    },
    include: {
      entities: {
        include: {
          entity: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!room) {
    throw createError({
      statusCode: 404,
      message: 'Room not found',
    })
  }

  return transformRoom(room)
})
