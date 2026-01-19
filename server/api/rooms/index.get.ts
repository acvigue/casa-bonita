import { getEffectiveUserId, requireAuth } from '../../utils/auth'
import { usePrisma } from '../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAuth(event)
  const userId = getEffectiveUserId(event)

  const rooms = await prisma.room.findMany({
    where: { userId },
    include: {
      entities: {
        include: {
          entity: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return rooms
})
