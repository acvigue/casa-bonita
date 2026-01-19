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

  const template = await prisma.configurationTemplate.findUnique({
    where: { id: templateId },
    include: {
      roomTemplates: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!template) {
    throw createError({
      statusCode: 404,
      message: 'Template not found',
    })
  }

  return template
})
