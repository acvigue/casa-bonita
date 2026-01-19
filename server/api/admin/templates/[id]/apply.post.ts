import { requireAdmin } from '../../../../utils/auth'
import { usePrisma } from '../../../../utils/prisma'



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

  const body = await readBody(event)

  if (!body.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'User IDs array is required',
    })
  }

  const template = await prisma.configurationTemplate.findUnique({
    where: { id: templateId },
    include: { roomTemplates: true },
  })

  if (!template) {
    throw createError({
      statusCode: 404,
      message: 'Template not found',
    })
  }

  const replaceExisting = body.replaceExisting === true
  const results: { userId: string, success: boolean, error?: string }[] = []

  for (const userId of body.userIds) {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        results.push({ userId, success: false, error: 'User not found' })
        continue
      }

      await prisma.$transaction(async (tx) => {
        // Update user configuration
        await tx.userConfiguration.upsert({
          where: { userId },
          update: {
            homeScreenConfig: template.homeScreenConfig,
            theme: template.theme,
            accentColor: template.accentColor,
            compactMode: template.compactMode,
          },
          create: {
            userId,
            homeScreenConfig: template.homeScreenConfig,
            theme: template.theme,
            accentColor: template.accentColor,
            compactMode: template.compactMode,
          },
        })

        if (replaceExisting) {
          // Delete existing rooms
          await tx.room.deleteMany({ where: { userId } })
        }

        // Create rooms from templates
        for (const roomTemplate of template.roomTemplates) {
          await tx.room.create({
            data: {
              userId,
              name: roomTemplate.name,
              icon: roomTemplate.icon,
              color: roomTemplate.color,
              sortOrder: roomTemplate.sortOrder,
              layout: roomTemplate.layout,
            },
          })
        }
      })

      results.push({ userId, success: true })
    }
    catch (error) {
      results.push({
        userId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    applied: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  }
})
