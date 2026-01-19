import { getEffectiveUserId, requireAuth } from '../../utils/auth'
import { stringifyJsonField, transformRoom } from '../../utils/json'
import { usePrisma } from '../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAuth(event)
  const userId = getEffectiveUserId(event)

  const body = await readBody(event)

  if (!body.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Room name is required',
    })
  }

  // Get max sort order for this user
  const maxSortOrder = await prisma.room.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  })

  const room = await prisma.room.create({
    data: {
      userId,
      name: body.name,
      icon: body.icon || 'mdi:home',
      color: body.color || null,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      layout: stringifyJsonField(body.layout),
    },
    include: {
      entities: true,
    },
  })

  return transformRoom(room)
})
