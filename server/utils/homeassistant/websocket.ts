import type {
  ResultPayload,
  EventPayload,
  Target,
  Context,
} from '#shared/generated/homeassistant-ws'

export interface HomeAssistantWSConfig {
  url: string
  token: string
}

export interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
  context: Context
}

export interface HAEvent {
  event_type: string
  data: Record<string, unknown>
  origin: string
  time_fired: string
  context: Context
}

export type EventHandler = (event: HAEvent) => void

interface PendingRequest {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

type ConnectionState = 'disconnected' | 'connecting' | 'authenticating' | 'connected'

export class HomeAssistantWebSocket {
  private ws: WebSocket | null = null
  private messageId = 0
  private pendingRequests = new Map<number, PendingRequest>()
  private subscriptions = new Map<number, EventHandler>()
  private config: HomeAssistantWSConfig
  private state: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(config: HomeAssistantWSConfig) {
    this.config = config
  }

  get connectionState(): ConnectionState {
    return this.state
  }

  async connect(): Promise<void> {
    if (this.state !== 'disconnected') {
      throw new Error(`Cannot connect: already ${this.state}`)
    }

    this.state = 'connecting'

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.url)

      this.ws.onopen = () => {
        this.state = 'authenticating'
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data as string, resolve, reject)
      }

      this.ws.onerror = (error) => {
        this.state = 'disconnected'
        reject(new Error(`WebSocket error: ${error}`))
      }

      this.ws.onclose = () => {
        this.handleClose()
      }
    })
  }

  private handleMessage(
    data: string,
    connectResolve?: () => void,
    connectReject?: (error: Error) => void
  ): void {
    const message = JSON.parse(data)

    switch (message.type) {
      case 'auth_required':
        this.sendRaw({ type: 'auth', access_token: this.config.token })
        break

      case 'auth_ok':
        this.state = 'connected'
        this.reconnectAttempts = 0
        // Enable coalesced messages for better performance
        this.sendRaw({
          id: this.nextId(),
          type: 'supported_features',
          features: { coalesce_messages: 1 },
        })
        connectResolve?.()
        break

      case 'auth_invalid':
        this.state = 'disconnected'
        connectReject?.(new Error(`Authentication failed: ${message.message}`))
        break

      case 'result':
        this.handleResult(message as ResultPayload)
        break

      case 'event':
        this.handleEvent(message as EventPayload)
        break

      case 'pong':
        this.handleResult({ ...message, success: true, result: null })
        break
    }
  }

  private handleResult(message: ResultPayload): void {
    const pending = this.pendingRequests.get(message.id)
    if (!pending) return

    this.pendingRequests.delete(message.id)

    if (message.success) {
      pending.resolve(message.result)
    } else {
      pending.reject(
        new Error(message.error?.message || 'Unknown error')
      )
    }
  }

  private handleEvent(message: EventPayload): void {
    const handler = this.subscriptions.get(message.id)
    if (handler && message.event) {
      handler({
        event_type: message.event.eventType || '',
        data: message.event.data || {},
        origin: message.event.origin || '',
        time_fired: message.event.timeFired || '',
        context: message.event.context || {},
      })
    }
  }

  private handleClose(): void {
    const wasConnected = this.state === 'connected'
    this.state = 'disconnected'
    this.ws = null

    // Reject all pending requests
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('Connection closed'))
    }
    this.pendingRequests.clear()

    // Attempt reconnection if we were connected
    if (wasConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.connect().catch(console.error)
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  private nextId(): number {
    return ++this.messageId
  }

  private sendRaw(message: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    this.ws.send(JSON.stringify(message))
  }

  private send<T>(type: string, payload?: Omit<T, 'id' | 'type'>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextId()
      this.pendingRequests.set(id, { resolve, reject })
      this.sendRaw({ id, type, ...payload })
    })
  }

  async subscribeEvents(eventType?: string, handler?: EventHandler): Promise<number> {
    const id = this.nextId()
    const payload: Record<string, unknown> = { id, type: 'subscribe_events' }
    if (eventType) payload.event_type = eventType

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: () => {
          if (handler) {
            this.subscriptions.set(id, handler)
          }
          resolve(id)
        },
        reject,
      })
      this.sendRaw(payload)
    })
  }

  async subscribeTrigger(
    trigger: Record<string, unknown> | Record<string, unknown>[],
    handler?: EventHandler
  ): Promise<number> {
    const id = this.nextId()

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: () => {
          if (handler) {
            this.subscriptions.set(id, handler)
          }
          resolve(id)
        },
        reject,
      })
      this.sendRaw({ id, type: 'subscribe_trigger', trigger })
    })
  }

  async unsubscribe(subscriptionId: number): Promise<void> {
    await this.send('unsubscribe_events', { subscription: subscriptionId })
    this.subscriptions.delete(subscriptionId)
  }

  async callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: Target,
    returnResponse = false
  ): Promise<unknown> {
    const payload: Record<string, unknown> = { domain, service }
    if (serviceData) payload.service_data = serviceData
    if (target) payload.target = target
    if (returnResponse) payload.return_response = true
    return this.send('call_service', payload)
  }

  async getStates(): Promise<HAState[]> {
    return this.send('get_states') as Promise<HAState[]>
  }

  async getConfig(): Promise<Record<string, unknown>> {
    return this.send('get_config') as Promise<Record<string, unknown>>
  }

  async getServices(): Promise<Record<string, unknown>> {
    return this.send('get_services') as Promise<Record<string, unknown>>
  }

  async getPanels(): Promise<Record<string, unknown>> {
    return this.send('get_panels') as Promise<Record<string, unknown>>
  }

  async fireEvent(eventType: string, eventData?: Record<string, unknown>): Promise<unknown> {
    const payload: Record<string, unknown> = { event_type: eventType }
    if (eventData) payload.event_data = eventData
    return this.send('fire_event', payload)
  }

  async ping(): Promise<void> {
    await this.send('ping')
  }

  disconnect(): void {
    if (this.ws) {
      this.maxReconnectAttempts = 0 // Prevent reconnection
      this.ws.close()
      this.ws = null
    }
    this.state = 'disconnected'
  }
}

let instance: HomeAssistantWebSocket | null = null

export function useHomeAssistantWS(config?: HomeAssistantWSConfig): HomeAssistantWebSocket {
  if (!instance && config) {
    instance = new HomeAssistantWebSocket(config)
  }
  if (!instance) {
    throw new Error('HomeAssistant WebSocket not initialized. Provide config on first call.')
  }
  return instance
}
