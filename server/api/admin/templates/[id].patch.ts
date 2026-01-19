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

  const body = await readBody(event)

  // If setting as default, unset other defaults
  if (body.isDefault && !existingTemplate.isDefault) {
    await prisma.configurationTemplate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  const allowedFields = [
    'name',
    'description',
    'isDefault',
    'homeScreenConfig',
    'theme',
    'accentColor',
    'compactMode',
  ]

  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  const template = await prisma.configurationTemplate.update({
    where: { id: templateId },
    data: updateData,
    include: {
      roomTemplates: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  return template
})
