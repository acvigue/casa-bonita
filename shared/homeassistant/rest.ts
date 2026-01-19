import createClient from 'openapi-fetch'
import type { paths } from '#shared/generated/homeassistant-rest'

export interface HomeAssistantRestConfig {
  baseUrl: string
  token: string
}

export function createHomeAssistantClient(config: HomeAssistantRestConfig) {
  return createClient<paths>({
    baseUrl: config.baseUrl,
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
  })
}

export type HomeAssistantClient = ReturnType<typeof createHomeAssistantClient>
