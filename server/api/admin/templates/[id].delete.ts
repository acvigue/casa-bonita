import { requireAdmin } from '../../../utils/auth'
import { usePrisma } from '../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAdmin(event)

  const templateId = getRouterParam(event, 'id')

  if (!templateId) {
    throw createError({
      statusCode: 400,
      message: 'Template ID is required',
    })
  }

  const existingTemplate = await prisma.configurationTemplate.findUnique({
    where: { id: templateId },
  })

  if (!existingTemplate) {
    throw createError({
      statusCode: 404,
      message: 'Template not found',
    })
  }

  await prisma.configurationTemplate.delete({
    where: { id: templateId },
  })

  return { success: true }
})
