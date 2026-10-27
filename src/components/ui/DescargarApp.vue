<template>
  <div class="app-dl">
    <div class="app-ico"><i class="ti ti-device-mobile-down" aria-hidden="true"></i></div>
    <div class="app-tx">
      <strong>App Kiosko SIAG (Android)</strong>
      <span v-if="cargando">Consultando versión…</span>
      <span v-else-if="info">Versión {{ info.versionName }} · {{ mb }} MB<template v-if="info.notas"> · {{ info.notas }}</template></span>
      <span v-else>Aún no hay una versión publicada</span>
    </div>
    <a class="app-btn" :href="info?.apk_url || APK_URL" :download="(info?.apk_url || APK_URL).split('/').pop()">
      <i class="ti ti-download" aria-hidden="true"></i> Descargar / actualizar
    </a>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api.js'

// El APK vive en el propio panel: /descarga/kiosko_SIAG.apk (en prod: /SIAG/descarga/...)
const APK_URL = import.meta.env.BASE_URL + 'descarga/kiosko_SIAG.apk'
const info = ref(null)
const cargando = ref(true)
const mb = computed(() => info.value?.tamano ? (info.value.tamano / 1048576).toFixed(1) : '—')

onMounted(async () => {
  try {
    const { data } = await api.get('/app/version')
    info.value = data?.data || null
  } catch { info.value = null } finally { cargando.value = false }
})
</script>

<style scoped>
.app-dl { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; flex-wrap: wrap; }
.app-ico { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; font-size: 22px; background: rgba(79,142,247,.15); color: #4f8ef7; }
.app-tx { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--t2, #9aa4b2); }
.app-tx strong { font-size: 13px; color: var(--t1, inherit); }
.app-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 9px; background: #4f8ef7; color: #fff; font-size: 13px; font-weight: 500; text-decoration: none; }
.app-btn:hover { filter: brightness(1.1); }
</style>
