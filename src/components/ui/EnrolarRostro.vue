<script setup>
// Captura de rostro con TensorFlow.js (2 capturas) -- estilo Cheil.
// Se usa igual en el modal del perfil y en la página pública del link.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { cargarModelos, descriptorDesdeVideo, abrirCamara, detenerCamara } from '@/composables/useFaceEnroll.js'

const props = defineProps({
  // async (descriptor1[], descriptor2[]) => ({ status, message })
  submit: { type: Function, required: true },
})
const emit = defineEmits(['done'])

const videoRef = ref(null)
const estado   = ref('cargando')   // cargando | listo | procesando | enviando | ok | error
const paso     = ref(1)
const mensaje  = ref('Cargando modelos de IA...')
let stream = null
let d1 = null

function set(e, m) { estado.value = e; mensaje.value = m }

async function iniciar() {
  d1 = null; paso.value = 1
  set('cargando', 'Cargando modelos de IA...')
  try {
    await cargarModelos()
    set('cargando', 'Iniciando cámara...')
    stream = await abrirCamara(videoRef.value)
    set('listo', 'Coloca tu rostro dentro del óvalo y presiona Capturar')
  } catch (e) {
    set('error', e?.name === 'NotAllowedError'
      ? 'Permite el acceso a la cámara en el navegador y reintenta'
      : (e?.message || 'No se pudo iniciar la cámara o los modelos'))
  }
}

async function capturar() {
  if (estado.value !== 'listo') return
  set('procesando', paso.value === 1 ? 'Procesando primera captura...' : 'Procesando segunda captura...')
  const d = await descriptorDesdeVideo(videoRef.value)
  if (!d) {
    set('listo', 'No se detectó el rostro claramente — acércate un poco y busca buena luz')
    return
  }
  if (paso.value === 1) {
    d1 = d; paso.value = 2
    set('listo', 'Listo. Ahora una segunda captura para confirmar')
    return
  }
  set('enviando', 'Guardando enrolamiento...')
  try {
    const res = await props.submit(d1, d)
    if (res?.status === 'ok') {
      set('ok', 'Rostro enrolado correctamente')
      detenerCamara(stream); stream = null
      emit('done')
    } else {
      paso.value = 2
      set('listo', res?.message || 'No se pudo enrolar, intenta de nuevo')
    }
  } catch (e) {
    paso.value = 2
    set('listo', e?.response?.data?.message || e?.message || 'Error al enrolar, intenta de nuevo')
  }
}

function reiniciar() { d1 = null; paso.value = 1; set('listo', 'Coloca tu rostro dentro del óvalo y presiona Capturar') }

onMounted(iniciar)
onBeforeUnmount(() => detenerCamara(stream))
</script>

<template>
  <div class="er-wrap">
    <div class="er-pasos">
      <span class="er-paso" :class="{ on: paso >= 1 }">1</span>
      <span class="er-linea" :class="{ on: paso >= 2 }"></span>
      <span class="er-paso" :class="{ on: paso >= 2 || estado === 'ok' }">2</span>
    </div>

    <div class="er-cam">
      <video ref="videoRef" playsinline muted class="er-video"></video>
      <div class="er-ovalo" :class="{ ok: estado === 'ok' }"></div>
      <div v-if="estado === 'cargando' || estado === 'procesando' || estado === 'enviando'" class="er-spin-wrap">
        <i class="ti ti-loader-2 er-spin"></i>
      </div>
      <div v-if="estado === 'ok'" class="er-ok"><i class="ti ti-circle-check"></i></div>
    </div>

    <p class="er-msg" :class="{ err: estado === 'error', ok: estado === 'ok' }">{{ mensaje }}</p>

    <div class="er-acts">
      <button v-if="estado === 'error'" class="er-btn main" @click="iniciar">
        <i class="ti ti-refresh"></i> Reintentar
      </button>
      <template v-else-if="estado !== 'ok'">
        <button class="er-btn main" :disabled="estado !== 'listo'" @click="capturar">
          <i class="ti ti-camera"></i> {{ paso === 1 ? 'Capturar' : 'Capturar y guardar' }}
        </button>
        <button v-if="paso === 2" class="er-btn" :disabled="estado !== 'listo'" @click="reiniciar">
          <i class="ti ti-rotate"></i> Empezar de nuevo
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.er-wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.er-pasos { display: flex; align-items: center; gap: 8px; }
.er-paso { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 700;
  background: var(--bg3, #2a3142); color: var(--tx2, #8a92a6); }
.er-paso.on { background: var(--acc, #4f8ef7); color: #fff; }
.er-linea { width: 44px; height: 2px; background: var(--bg3, #2a3142); }
.er-linea.on { background: var(--acc, #4f8ef7); }

.er-cam { position: relative; width: 100%; max-width: 420px; aspect-ratio: 4 / 3; background: #000; border-radius: 16px; overflow: hidden; }
.er-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
.er-ovalo { position: absolute; inset: 0; margin: auto; width: 52%; height: 78%; border-radius: 50%;
  border: 3px dashed rgba(255,255,255,.75); box-shadow: 0 0 0 999px rgba(0,0,0,.45); pointer-events: none; }
.er-ovalo.ok { border: 3px solid #22c97a; }
.er-spin-wrap { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.35); }
.er-spin { font-size: 34px; color: #fff; animation: er-rot 1s linear infinite; }
@keyframes er-rot { to { transform: rotate(360deg); } }
.er-ok { position: absolute; inset: 0; display: grid; place-items: center; font-size: 70px; color: #22c97a; }

.er-msg { margin: 0; text-align: center; font-size: 13px; color: var(--tx1, var(--tx0)); min-height: 36px; }
.er-msg.err { color: #f05454; }
.er-msg.ok  { color: #22c97a; font-weight: 600; }
.er-acts { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.er-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 600; font-family: inherit; background: var(--bg2, #1e2535); color: var(--tx0, #fff);
  border: 0.5px solid var(--bdr2, rgba(255,255,255,.15)); }
.er-btn.main { background: var(--acc, #4f8ef7); border-color: var(--acc, #4f8ef7); color: #fff; }
.er-btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
