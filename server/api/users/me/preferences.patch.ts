import { getEffectiveUserId, requireAuth } from '../../../utils/auth'
import { parseJsonField, stringifyJsonField } from '../../../utils/json'
import { usePrisma } from '../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAuth(event)
  const userId = getEffectiveUserId(event)

  const body = await readBody(event)

  if (typeof body !== 'object' || body === null) {
    throw createError({
      statusCode: 400,
      message: 'Request body must be an object of key-value pairs',
    })
  }

  // Upsert each preference
  const results: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value === null) {
      // Delete preference
      await prisma.userPreference.deleteMany({
        where: { userId, key },
      })
    }
    else {
      // Upsert preference (stringify value for storage)
      const pref = await prisma.userPreference.upsert({
        where: { userId_key: { userId, key } },
        update: { value: stringifyJsonField(value) },
        create: { userId, key, value: stringifyJsonField(value) },
      })
      results[key] = parseJsonField(pref.value)
    }
  }

  return results
})
