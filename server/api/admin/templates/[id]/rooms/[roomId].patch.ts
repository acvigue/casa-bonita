import { requireAdmin } from '../../../../../utils/auth'
import { usePrisma } from '../../../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAdmin(event)

  const templateId = getRouterParam(event, 'id')
  const roomId = getRouterParam(event, 'roomId')

  if (!templateId || !roomId) {
    throw createError({
      statusCode: 400,
      message: 'Template ID and Room ID are required',
    })
  }

  const roomTemplate = await prisma.roomTemplate.findFirst({
    where: { id: roomId, templateId },
  })

  if (!roomTemplate) {
    throw createError({
      statusCode: 404,
      message: 'Room template not found',
    })
  }

  const body = await readBody(event)

  const allowedFields = ['name', 'icon', 'color', 'sortOrder', 'layout', 'entityPatterns']
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  const updated = await prisma.roomTemplate.update({
    where: { id: roomId },
    data: updateData,
  })

  return updated
})
