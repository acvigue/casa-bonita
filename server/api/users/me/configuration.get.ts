import { getEffectiveUserId, requireAuth } from '../../../utils/auth'
import { transformUserConfiguration } from '../../../utils/json'
import { usePrisma } from '../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAuth(event)
  const userId = getEffectiveUserId(event)

  const configuration = await prisma.userConfiguration.findUnique({
    where: { userId },
  })

  if (!configuration) {
    throw createError({
      statusCode: 404,
      message: 'Configuration not found',
    })
  }

  return transformUserConfiguration(configuration)
})
