<template>{{ auth.user.value }}</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
});

const auth = useAuth();
</script>
