import { requireAdmin } from '../../utils/auth'
import { usePrisma } from '../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAdmin(event)

  const users = await prisma.user.findMany({
    include: {
      configuration: true,
      _count: {
        select: {
          rooms: true,
        },
      },
    },
    orderBy: { lastActive: 'desc' },
  })

  return users.map(user => ({
    id: user.id,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
    firstSeen: user.firstSeen,
    lastActive: user.lastActive,
    roomCount: user._count.rooms,
    configuration: user.configuration,
  }))
})
