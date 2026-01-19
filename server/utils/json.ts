// Utility functions for handling JSON stored as strings in SQLite

export function parseJsonField<T = unknown>(value: string | null | undefined): T {
  if (!value) return {} as T
  try {
    return JSON.parse(value) as T
  }
  catch {
    return {} as T
  }
}

export function stringifyJsonField(value: unknown): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value ?? {})
}

// Transform room entity for API response
export function transformRoomEntity(entity: {
  widgetConfig: string
  entity?: { attributes: string } | null
  [key: string]: unknown
}) {
  return {
    ...entity,
    widgetConfig: parseJsonField(entity.widgetConfig),
    entity: entity.entity
      ? {
          ...entity.entity,
          attributes: parseJsonField(entity.entity.attributes),
        }
      : null,
  }
}

// Transform room for API response
export function transformRoom(room: {
  layout: string
  entities?: Array<{ widgetConfig: string, entity?: { attributes: string } | null }>
  [key: string]: unknown
}) {
  return {
    ...room,
    layout: parseJsonField(room.layout),
    entities: room.entities?.map(transformRoomEntity),
  }
}

// Transform user configuration for API response
export function transformUserConfiguration(config: {
  homeScreenConfig: string
  [key: string]: unknown
}) {
  return {
    ...config,
    homeScreenConfig: parseJsonField(config.homeScreenConfig),
  }
}

// Transform configuration template for API response
export function transformConfigurationTemplate(template: {
  homeScreenConfig: string
  roomTemplates?: Array<{ layout: string, entityPatterns: string }>
  [key: string]: unknown
}) {
  return {
    ...template,
    homeScreenConfig: parseJsonField(template.homeScreenConfig),
    roomTemplates: template.roomTemplates?.map(rt => ({
      ...rt,
      layout: parseJsonField(rt.layout),
      entityPatterns: parseJsonField(rt.entityPatterns),
    })),
  }
}
