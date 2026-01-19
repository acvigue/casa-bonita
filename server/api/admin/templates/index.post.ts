import { requireAdmin } from '../../../utils/auth'
import { usePrisma } from '../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAdmin(event)

  const body = await readBody(event)

  if (!body.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Template name is required',
    })
  }

  // If setting as default, unset other defaults
  if (body.isDefault) {
    await prisma.configurationTemplate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  const template = await prisma.configurationTemplate.create({
    data: {
      name: body.name,
      description: body.description || null,
      isDefault: body.isDefault || false,
      homeScreenConfig: body.homeScreenConfig || {},
      theme: body.theme || 'system',
      accentColor: body.accentColor || null,
      compactMode: body.compactMode || false,
    },
    include: {
      roomTemplates: true,
    },
  })

  return template
})
