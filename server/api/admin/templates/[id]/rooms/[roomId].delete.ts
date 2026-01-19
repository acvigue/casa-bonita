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

  await prisma.roomTemplate.delete({
    where: { id: roomId },
  })

  return { success: true }
})
