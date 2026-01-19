import { getEffectiveUserId, requireAuth } from '../../../utils/auth'
import { stringifyJsonField, transformUserConfiguration } from '../../../utils/json'
import { usePrisma } from '../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAuth(event)
  const userId = getEffectiveUserId(event)

  const body = await readBody(event)

  // Validate allowed fields
  const allowedFields = [
    'homeScreenConfig',
    'theme',
    'accentColor',
    'compactMode',
    'showEntityIds',
    'defaultView',
    'autoSync',
  ]

  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      if (field === 'homeScreenConfig') {
        updateData[field] = stringifyJsonField(body[field])
      }
      else {
        updateData[field] = body[field]
      }
    }
  }

  const configuration = await prisma.userConfiguration.update({
    where: { userId },
    data: updateData,
  })

  return transformUserConfiguration(configuration)
})
