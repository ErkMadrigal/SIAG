<script setup>
// Página pública a la que llega el empleado con el link de enrolamiento.
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import EnrolarRostro from '@/components/ui/EnrolarRostro.vue'
import { enrolamientoPublicoService } from '@/services/enrolamientoPublico.service.js'

const route = useRoute()
const token = route.params.token
const cargando = ref(true)
const nombre = ref('')
const invalido = ref('')
const terminado = ref(false)

onMounted(async () => {
  try {
    const info = await enrolamientoPublicoService.info(token)
    nombre.value = info.nombre
  } catch (e) {
    invalido.value = e?.response?.data?.message || 'El link no es válido o ya venció.'
  } finally { cargando.value = false }
})

const enviar = (d1, d2) =>
  enrolamientoPublicoService.enrolar(token, d1, d2).catch(e => e?.response?.data || { status: 'error', message: 'Error de conexión' })
</script>

<template>
  <div class="ep-page">
    <div class="ep-card">
      <div class="ep-logo"><i class="ti ti-shield-check"></i></div>
      <h1>Enrolamiento facial</h1>

      <div v-if="cargando" class="ep-info"><i class="ti ti-loader-2 ep-spin"></i></div>

      <div v-else-if="invalido" class="ep-info err">
        <i class="ti ti-link-off" style="font-size:36px"></i>
        <p>{{ invalido }}</p>
      </div>

      <div v-else-if="terminado" class="ep-info ok">
        <i class="ti ti-circle-check" style="font-size:54px"></i>
        <p><strong>{{ nombre }}</strong>, tu rostro quedó registrado.</p>
        <small>Ya puedes cerrar esta página.</small>
      </div>

      <template v-else>
        <p class="ep-sub">Hola <strong>{{ nombre }}</strong>. Toma 2 capturas de tu rostro para usar el registro biométrico.</p>
        <EnrolarRostro :submit="enviar" @done="terminado = true" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.ep-page { min-height: 100vh; display: grid; place-items: center; padding: 18px; background: var(--bg0, #0b0f1a); color: var(--tx0, #fff); }
.ep-card { width: 100%; max-width: 480px; background: var(--bg1, #141a2a); border: 0.5px solid var(--bdr2, rgba(255,255,255,.12));
  border-radius: 20px; padding: 24px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.ep-logo { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; font-size: 24px;
  background: rgba(79,142,247,.15); color: var(--acc, #4f8ef7); }
h1 { margin: 0; font-size: 18px; }
.ep-sub { margin: 0; text-align: center; font-size: 13px; color: var(--tx2, #8a92a6); }
.ep-info { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 0; }
.ep-info.err { color: #f05454; }
.ep-info.ok { color: #22c97a; }
.ep-info small { color: var(--tx2, #8a92a6); }
.ep-spin { font-size: 30px; animation: ep-rot 1s linear infinite; }
@keyframes ep-rot { to { transform: rotate(360deg); } }
</style>
