import { requireAdmin } from '../../../../../utils/auth'
import { usePrisma } from '../../../../../utils/prisma'



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
  })

  if (!template) {
    throw createError({
      statusCode: 404,
      message: 'Template not found',
    })
  }

  const body = await readBody(event)

  if (!body.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Room name is required',
    })
  }

  // Get max sort order
  const maxSortOrder = await prisma.roomTemplate.aggregate({
    where: { templateId },
    _max: { sortOrder: true },
  })

  const roomTemplate = await prisma.roomTemplate.create({
    data: {
      templateId,
      name: body.name,
      icon: body.icon || 'mdi:home',
      color: body.color || null,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      layout: body.layout || {},
      entityPatterns: body.entityPatterns || [],
    },
  })

  return roomTemplate
})
