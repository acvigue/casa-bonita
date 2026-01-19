import { requireAdmin } from '../../utils/auth'
import { usePrisma } from '../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAdmin(event)

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required',
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      configuration: true,
      rooms: {
        include: {
          _count: {
            select: { entities: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      preferences: true,
    },
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  return user
})
