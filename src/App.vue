<template>
  <RouterView />
  <DialogHost />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore } from '@/stores/ui.js'
import DialogHost from '@/components/ui/DialogHost.vue'

const auth = useAuthStore()
const ui   = useUiStore()

onMounted(() => {
  if (auth.accessToken && !auth.user) {
    auth.restoreSession()
  }
})
</script>