<template>
  <RouterView />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore } from '@/stores/ui.js'

const auth = useAuthStore()
const ui   = useUiStore()

onMounted(() => {
  if (auth.accessToken && !auth.user) {
    auth.restoreSession()
  }
})
</script>