import { getEffectiveUserId, requireAuth } from '../../../utils/auth'
import { parseJsonField } from '../../../utils/json'
import { usePrisma } from '../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAuth(event)
  const userId = getEffectiveUserId(event)

  const preferences = await prisma.userPreference.findMany({
    where: { userId },
  })

  // Convert to key-value object, parsing JSON strings
  const result: Record<string, unknown> = {}
  for (const pref of preferences) {
    result[pref.key] = parseJsonField(pref.value)
  }

  return result
})
