import { requireAuth } from '../../utils/auth'
import { getHAProxyConfig } from '../../utils/homeassistant/proxy'

export default defineEventHandler(async (event) => {
  // Require authentication via JWT
  requireAuth(event)

  // Get proxy configuration based on environment
  const haConfig = getHAProxyConfig()

  // Extract the path from params (array for catch-all route)
  const pathSegments = getRouterParam(event, 'path') || ''
  const path = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments

  // Build target URL
  const targetUrl = `${haConfig.restUrl}/${path}`

  // Get the original request details
  const method = event.method
  const headers = new Headers()

  // Forward relevant headers
  const contentType = getHeader(event, 'content-type')
  if (contentType) headers.set('content-type', contentType)

  const accept = getHeader(event, 'accept')
  if (accept) headers.set('accept', accept)

  // Add HA authorization
  headers.set('Authorization', `Bearer ${haConfig.token}`)

  // Forward request body for POST/PUT/PATCH
  let body: string | undefined
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    body = await readRawBody(event) || undefined
  }

  // Forward query parameters
  const query = getQuery(event)
  const url = new URL(targetUrl)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  // Make the proxied request
  const response = await fetch(url.toString(), {
    method,
    headers,
    body,
  })

  // Forward response status
  setResponseStatus(event, response.status)

  // Forward response headers
  const responseContentType = response.headers.get('content-type')
  if (responseContentType) {
    setHeader(event, 'content-type', responseContentType)
  }

  // Return response body
  if (responseContentType?.includes('application/json')) {
    return response.json()
  }

  return response.text()
})
