interface AuthUser {
  id: string
  displayName: string
  isAdmin: boolean
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  ingressPath: string | null
}

export function useAuth() {
  const state = useState<AuthState>('auth', () => ({
    user: null,
    loading: true,
    error: null,
    ingressPath: null,
  }))

  const isAuthenticated = computed(() => !!state.value.user)
  const isAdmin = computed(() => state.value.user?.isAdmin ?? false)

  async function checkSession() {
    state.value.loading = true
    state.value.error = null

    try {
      const data = await $fetch('/api/auth/session', {
        method: 'GET',
      })

      state.value.user = data.user
      state.value.ingressPath = data.ingressPath ?? null
    }
    catch (err: unknown) {
      const error = err as { statusCode?: number, message?: string }
      if (error.statusCode === 401) {
        // Try to establish session from ingress
        await establishSession()
      }
      else {
        state.value.error = error.message ?? 'Authentication failed'
        state.value.user = null
      }
    }
    finally {
      state.value.loading = false
    }
  }

  async function establishSession() {
    try {
      const data = await $fetch('/api/auth/session', {
        method: 'POST',
      })

      state.value.user = data.user
      state.value.error = null
    }
    catch {
      // Not in ingress context or error
      state.value.error = 'Authentication required via Home Assistant'
      state.value.user = null
    }
  }

  async function logout() {
    await $fetch('/api/auth/session', { method: 'DELETE' })
    state.value.user = null
    state.value.ingressPath = null
  }

  return {
    user: computed(() => state.value.user),
    loading: computed(() => state.value.loading),
    error: computed(() => state.value.error),
    ingressPath: computed(() => state.value.ingressPath),
    isAuthenticated,
    isAdmin,
    checkSession,
    logout,
  }
}
