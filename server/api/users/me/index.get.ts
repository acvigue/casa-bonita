import { getEffectiveUserId, requireAuth } from '../../../utils/auth'
import { usePrisma } from '../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const auth = requireAuth(event)
  const userId = getEffectiveUserId(event)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      configuration: true,
    },
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  return {
    ...user,
    isImpersonating: userId !== auth.id,
    actualUser: userId !== auth.id
      ? {
          id: auth.id,
          displayName: auth.displayName,
          isAdmin: auth.isAdmin,
        }
      : null,
  }
})
