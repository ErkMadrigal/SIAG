<template>
  <Teleport to="body">
    <div class="ev-overlay" @click.self="$emit('close')">
      <div class="ev-box">
        <button class="ev-x" @click="$emit('close')"><i class="ti ti-x"></i></button>
        <div v-if="cargando" class="ev-msg">Cargando...</div>
        <div v-else-if="error" class="ev-msg err">{{ error }}</div>
        <img v-else :src="url" alt="Evidencia del registro" />
        <p class="ev-sub">Evidencia del registro · se elimina automáticamente al vencer la retención</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import api from '@/services/api.js'

const props = defineProps({ asistenciaId: { type: [String, Number], required: true } })
defineEmits(['close'])

const url = ref(''), cargando = ref(true), error = ref('')

onMounted(async () => {
  try {
    const r = await api.get(`/asistencias/${props.asistenciaId}/evidencia`, { responseType: 'blob' })
    url.value = URL.createObjectURL(r.data)
  } catch { error.value = 'No hay evidencia disponible (no se guardó o ya venció)' }
  finally { cargando.value = false }
})
onBeforeUnmount(() => { if (url.value) URL.revokeObjectURL(url.value) })
</script>

<style scoped>
.ev-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); display: flex; align-items: center; justify-content: center; z-index: 1100; padding: 20px; }
.ev-box { position: relative; background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 14px; padding: 16px; max-width: 360px; width: 100%; text-align: center; }
.ev-box img { width: 100%; border-radius: 10px; display: block; }
.ev-x { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: var(--bg2); color: var(--tx1); cursor: pointer; }
.ev-msg { padding: 40px 10px; font-size: 13px; color: var(--tx2); } .ev-msg.err { color: var(--red); }
.ev-sub { font-size: 11px; color: var(--tx3); margin-top: 10px; }
</style>
