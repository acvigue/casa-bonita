export interface HAProxyConfig {
  restUrl: string
  wsUrl: string
  token: string
  isDevMode: boolean
}

export function getHAProxyConfig(): HAProxyConfig {
  const config = useRuntimeConfig()
  const isProduction = process.env.NODE_ENV === 'production'

  // Production: use SUPERVISOR_TOKEN with supervisor URLs
  if (isProduction && config.supervisorToken) {
    return {
      restUrl: 'http://supervisor/core/api',
      wsUrl: 'ws://supervisor/core/websocket',
      token: config.supervisorToken,
      isDevMode: false,
    }
  }

  // Dev mode: use configured URLs from .env
  return {
    restUrl: config.homeAssistant.url,
    wsUrl: config.homeAssistant.wsUrl,
    token: config.homeAssistant.token,
    isDevMode: true,
  }
}
