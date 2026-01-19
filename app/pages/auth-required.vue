<script setup lang="ts">
const { error, checkSession } = useAuth();

async function retry() {
  await checkSession();

  const redirectTo = useRoute().query["redirect"];
  if (redirectTo && typeof redirectTo === "string") {
    return navigateTo(redirectTo);
  }
}
</script>

<template>
  <div class="auth-required">
    <div class="auth-required__content">
      <h1>Authentication Required</h1>
      <p>
        This application must be accessed through Home Assistant's ingress
        system.
      </p>
      <p v-if="error" class="auth-required__error">
        {{ error }}
      </p>
      <div class="auth-required__actions">
        <button @click="retry">Retry</button>
      </div>
      <p class="auth-required__help">
        Please access this add-on from the Home Assistant sidebar.
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-required {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: #f5f5f5;
}

.auth-required__content {
  max-width: 400px;
  text-align: center;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.auth-required__content h1 {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  color: #333;
}

.auth-required__content p {
  margin: 0 0 1rem;
  color: #666;
}

.auth-required__error {
  color: #d32f2f;
  background: #ffebee;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.auth-required__actions {
  margin: 1.5rem 0;
}

.auth-required__actions button {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.auth-required__actions button:hover {
  background: #1565c0;
}

.auth-required__help {
  font-size: 0.875rem;
  color: #999;
}
</style>
