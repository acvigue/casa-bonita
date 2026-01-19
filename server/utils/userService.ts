import { usePrisma } from './prisma'

export async function ensureUser(
  id: string,
  displayName: string,
  isAdmin: boolean,
): Promise<void> {
  const prisma = usePrisma()

  const existingUser = await prisma.user.findUnique({
    where: { id },
  })

  if (existingUser) {
    // Update last active and any changed info
    await prisma.user.update({
      where: { id },
      data: {
        displayName,
        isAdmin,
        lastActive: new Date(),
      },
    })
    return
  }

  // Create new user with default configuration
  await prisma.user.create({
    data: {
      id,
      displayName,
      isAdmin,
      configuration: {
        create: {},
      },
    },
  })

  // Apply default template if exists
  await applyDefaultTemplate(id)
}

export async function applyDefaultTemplate(userId: string): Promise<boolean> {
  const prisma = usePrisma()

  const defaultTemplate = await prisma.configurationTemplate.findFirst({
    where: { isDefault: true },
    include: { roomTemplates: true },
  })

  if (!defaultTemplate) {
    return false
  }

  // Update user configuration with template settings
  await prisma.userConfiguration.update({
    where: { userId },
    data: {
      homeScreenConfig: defaultTemplate.homeScreenConfig,
      theme: defaultTemplate.theme,
      accentColor: defaultTemplate.accentColor,
      compactMode: defaultTemplate.compactMode,
    },
  })

  // Create rooms from room templates
  for (const roomTemplate of defaultTemplate.roomTemplates) {
    await prisma.room.create({
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

  return true
}

export async function syncUserConfiguration(
  sourceUserId: string,
  targetUserId: string,
  options: {
    includeRooms?: boolean
    includePreferences?: boolean
    replaceExisting?: boolean
  } = {},
): Promise<void> {
  const prisma = usePrisma()

  const {
    includeRooms = true,
    includePreferences = true,
    replaceExisting = false,
  } = options

  const sourceConfig = await prisma.userConfiguration.findUnique({
    where: { userId: sourceUserId },
  })

  if (!sourceConfig) {
    throw new Error('Source user has no configuration')
  }

  await prisma.$transaction(async (tx) => {
    // Copy configuration settings
    await tx.userConfiguration.upsert({
      where: { userId: targetUserId },
      update: {
        homeScreenConfig: sourceConfig.homeScreenConfig,
        theme: sourceConfig.theme,
        accentColor: sourceConfig.accentColor,
        compactMode: sourceConfig.compactMode,
        showEntityIds: sourceConfig.showEntityIds,
        defaultView: sourceConfig.defaultView,
      },
      create: {
        userId: targetUserId,
        homeScreenConfig: sourceConfig.homeScreenConfig,
        theme: sourceConfig.theme,
        accentColor: sourceConfig.accentColor,
        compactMode: sourceConfig.compactMode,
        showEntityIds: sourceConfig.showEntityIds,
        defaultView: sourceConfig.defaultView,
      },
    })

    if (includeRooms) {
      if (replaceExisting) {
        await tx.room.deleteMany({ where: { userId: targetUserId } })
      }

      const sourceRooms = await tx.room.findMany({
        where: { userId: sourceUserId },
        include: { entities: true },
      })

      for (const room of sourceRooms) {
        const newRoom = await tx.room.create({
          data: {
            userId: targetUserId,
            name: room.name,
            icon: room.icon,
            color: room.color,
            sortOrder: room.sortOrder,
            layout: room.layout,
          },
        })

        // Copy room entities
        for (const entity of room.entities) {
          await tx.roomEntity.create({
            data: {
              roomId: newRoom.id,
              entityId: entity.entityId,
              displayName: entity.displayName,
              icon: entity.icon,
              hidden: entity.hidden,
              sortOrder: entity.sortOrder,
              widgetType: entity.widgetType,
              widgetConfig: entity.widgetConfig,
              gridX: entity.gridX,
              gridY: entity.gridY,
              gridWidth: entity.gridWidth,
              gridHeight: entity.gridHeight,
            },
          })
        }
      }
    }

    if (includePreferences) {
      if (replaceExisting) {
        await tx.userPreference.deleteMany({ where: { userId: targetUserId } })
      }

      const sourcePrefs = await tx.userPreference.findMany({
        where: { userId: sourceUserId },
      })

      for (const pref of sourcePrefs) {
        await tx.userPreference.upsert({
          where: {
            userId_key: { userId: targetUserId, key: pref.key },
          },
          update: { value: pref.value },
          create: {
            userId: targetUserId,
            key: pref.key,
            value: pref.value,
          },
        })
      }
    }
  })
}
