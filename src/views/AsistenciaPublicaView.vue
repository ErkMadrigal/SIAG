<template>
  <div class="as-wrap">
    <div class="as-top">
      <router-link to="/login" class="as-back"><i class="ti ti-arrow-left"></i> Iniciar sesión</router-link>
    </div>

    <div class="as-card">
      <div class="as-brand">
        <div class="as-logo"><i class="ti ti-shield-half"></i></div>
        <div><div class="as-name">SIAG</div><div class="as-sub">Registro de asistencia</div></div>
      </div>

      <div class="as-seg">
        <button :class="{ on: modo === 'entrada' }" @click="cambiarModo('entrada')"><i class="ti ti-login"></i> Entrada</button>
        <button :class="{ on: modo === 'salida', sal: true }" @click="cambiarModo('salida')"><i class="ti ti-logout"></i> Salida</button>
      </div>

      <!-- Paso 1: identificar -->
      <template v-if="!empleado">
        <div class="as-ico" :class="modo"><i :class="['ti', modo === 'entrada' ? 'ti-login' : 'ti-logout']"></i></div>
        <h2 class="as-h">Captura de {{ modo === 'entrada' ? 'entrada' : 'salida' }}</h2>
        <p class="as-p">Ingresa tu CURP o RFC para verificar tu rostro</p>
        <div class="as-input">
          <i class="ti ti-key"></i>
          <input v-model="query" placeholder="CURP o RFC" @input="query = query.toUpperCase()" @keydown.enter="buscar" :disabled="buscando" />
        </div>
        <button class="as-btn" :class="modo" @click="buscar" :disabled="buscando || !query">
          <i :class="['ti', buscando ? 'ti-loader-2 spin' : 'ti-search']"></i> {{ buscando ? 'Buscando...' : 'Continuar' }}
        </button>
        <div v-if="error" class="as-err"><i class="ti ti-alert-circle"></i> {{ error }}</div>
      </template>

      <!-- Paso 2: rostro -->
      <template v-else>
        <div class="as-emp">
          <img v-if="empleado.fotos" :src="empleado.fotos" class="as-foto" />
          <div v-else class="as-foto av">{{ iniciales }}</div>
          <div>
            <strong>{{ empleado.nombreCompleto }}</strong>
            <span>No. {{ String(empleado.id).padStart(6, '0') }}<template v-if="empleado.puesto"> · {{ empleado.puesto }}</template></span>
          </div>
          <button class="as-x" @click="reset" title="Cambiar"><i class="ti ti-x"></i></button>
        </div>

        <div v-if="!descriptor" class="as-sin">
          <i class="ti ti-face-id-error"></i>
          <p>Aún no tienes rostro enrolado. Pide a un administrador que lo enrole o usa la app Kiosko.</p>
        </div>
        <template v-else>
          <div class="as-cam">
            <video ref="videoRef" autoplay muted playsinline></video>
            <div v-if="procesando" class="as-ov"><i class="ti ti-loader-2 spin"></i><p>Comparando…</p></div>
            <div v-if="res === 'ok'" class="as-ov ok"><i class="ti ti-circle-check"></i><p>¡Verificado!</p></div>
            <div v-if="res === 'fail'" class="as-ov fail"><i class="ti ti-circle-x"></i><p>No coincide</p></div>
          </div>
          <button class="as-btn" :class="modo" :disabled="procesando || !camara || res === 'ok'" @click="leer">
            <i :class="['ti', procesando ? 'ti-loader-2 spin' : 'ti-aperture']"></i>
            {{ procesando ? 'Procesando...' : 'Registrar ' + modo }}
          </button>
        </template>
        <p v-if="msg" class="as-msg" :class="res">{{ msg }}</p>
        <div v-if="error" class="as-err"><i class="ti ti-alert-circle"></i> {{ error }}</div>
      </template>
    </div>

    <DescargarApp class="as-dl" />
    <p class="as-foot">SIAG SIA · {{ new Date().getFullYear() }}</p>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'
import axios from 'axios'
import { API_BASE } from '@/services/api.js'
import DescargarApp from '@/components/ui/DescargarApp.vue'
import { cargarModelos, descriptorDesdeVideo, compararDescriptores } from '@/composables/useFaceEnroll.js'

// Cliente sin sesión (vista pública)
const http = axios.create({ baseURL: API_BASE })

const modo = ref('entrada')
const query = ref('')
const buscando = ref(false)
const procesando = ref(false)
const camara = ref(false)
const empleado = ref(null)
const descriptor = ref(null)
const error = ref('')
const msg = ref('')
const res = ref('')
const videoRef = ref(null)
let stream = null

const iniciales = computed(() => (empleado.value?.nombreCompleto || 'US').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase())

onUnmounted(parar)

function cambiarModo(m) { modo.value = m; reset() }
function reset() {
  parar(); query.value = ''; empleado.value = null; descriptor.value = null
  error.value = ''; msg.value = ''; res.value = ''
}
function parar() {
  stream?.getTracks().forEach(t => t.stop()); stream = null; camara.value = false
}

async function buscar() {
  if (!query.value.trim()) return
  buscando.value = true; error.value = ''
  try {
    const { data } = await http.post('/auth/biometrico/buscar', { query: query.value.trim() })
    const emp = data.data?.[0] || data.data
    if (!emp) { error.value = data.message || 'Empleado no encontrado'; return }
    empleado.value = emp
    descriptor.value = null
    if (Number(emp.rostro_enrolado) === 1 && emp.descriptor_servidor) {
      try { descriptor.value = JSON.parse(emp.descriptor_servidor) } catch { /* sin descriptor */ }
    }
    if (descriptor.value) {
      msg.value = 'Cargando modelos de IA...'
      await cargarModelos(); msg.value = ''
      await nextTick(); await iniciarCamara()
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Empleado no encontrado'
  } finally { buscando.value = false }
}

async function iniciarCamara() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    camara.value = true
  } catch { error.value = 'No se pudo acceder a la cámara' }
}

async function leer() {
  procesando.value = true; res.value = ''; msg.value = 'Analizando rostro...'; error.value = ''
  try {
    const cap = await descriptorDesdeVideo(videoRef.value)
    if (!cap) { res.value = 'fail'; msg.value = 'No se detectó el rostro. Acércate y busca buena luz.'; return }
    const r = compararDescriptores(descriptor.value, cap)
    if (!r.similar) { res.value = 'fail'; msg.value = `Rostro no coincide (${(r.score * 100).toFixed(1)}%)`; return }
    res.value = 'ok'; msg.value = `Coincide ${(r.score * 100).toFixed(1)}%`
    await registrar()
  } catch (e) { res.value = 'fail'; msg.value = 'Error: ' + e.message }
  finally { procesando.value = false }
}

function geo() {
  return new Promise((ok, no) => navigator.geolocation.getCurrentPosition(
    p => ok({ lat: p.coords.latitude, lon: p.coords.longitude }), no,
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }))
}
async function ip() {
  try { return (await (await fetch('https://api.ipify.org?format=json')).json()).ip } catch { return 'No disponible' }
}

async function registrar() {
  try {
    const c = await geo()
    const { data } = await http.post('/biometrico/registro', {
      id_empleado: empleado.value.id, lat: c.lat, lon: c.lon, ip: await ip(),
      salida: modo.value === 'salida', id_capturista: 0, origen: 'web',
    })
    if (data?.status === 'bloqueado') {
      res.value = 'fail'; msg.value = `No puede salir todavía. Faltan ${data.data?.tiempo_restante ?? ''}`; return
    }
    msg.value = `✓ ${modo.value === 'entrada' ? 'Entrada' : 'Salida'} registrada`
    parar()
    setTimeout(reset, 3500)
  } catch (e) {
    const d = e.response?.data
    res.value = 'fail'
    msg.value = e.response?.status === 403
      ? (d?.message || 'Tu ubicación no está en una zona permitida')
      : e.response?.status === 423
      ? `No puede salir todavía. Faltan ${d?.data?.tiempo_restante ?? ''}`
      : (d?.message || (e.code === 1 ? 'Activa la ubicación (GPS) del navegador' : 'Error al registrar asistencia'))
  }
}
</script>

<style scoped>
.as-wrap { min-height: 100vh; background: radial-gradient(1200px 600px at 50% -10%, #1b2a4a 0%, #0f1117 60%); display: flex; flex-direction: column; align-items: center; padding: 16px; gap: 14px; color: #e8ecf4; }
.as-top { width: 100%; max-width: 440px; }
.as-back { color: #8b97ad; font-size: 13px; text-decoration: none; display: inline-flex; gap: 6px; align-items: center; }
.as-back:hover { color: #fff; }
.as-card { width: 100%; max-width: 440px; background: #171c28; border: 1px solid #263046; border-radius: 22px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,.45); display: flex; flex-direction: column; gap: 14px; align-items: stretch; }
.as-brand { display: flex; align-items: center; gap: 12px; }
.as-logo { width: 44px; height: 44px; border-radius: 12px; background: #4f8ef7; display: grid; place-items: center; font-size: 24px; color: #fff; }
.as-name { font-size: 18px; font-weight: 600; }
.as-sub { font-size: 12px; color: #8b97ad; }
.as-seg { display: grid; grid-template-columns: 1fr 1fr; background: #0f1320; border-radius: 12px; padding: 4px; gap: 4px; }
.as-seg button { border: 0; background: transparent; color: #8b97ad; padding: 10px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 14px; display: flex; gap: 6px; align-items: center; justify-content: center; }
.as-seg button.on { background: rgba(52,211,153,.16); color: #34d399; font-weight: 600; }
.as-seg button.on.sal { background: rgba(240,84,84,.16); color: #f05454; }
.as-ico { width: 74px; height: 74px; border-radius: 22px; display: grid; place-items: center; font-size: 34px; margin: 6px auto 0; }
.as-ico.entrada { background: rgba(52,211,153,.16); color: #34d399; }
.as-ico.salida { background: rgba(240,84,84,.16); color: #f05454; }
.as-h { text-align: center; font-size: 20px; font-weight: 600; margin: 0; }
.as-p { text-align: center; color: #8b97ad; font-size: 13px; margin: 0; }
.as-input { display: flex; align-items: center; gap: 10px; background: #0f1320; border: 1px solid #263046; border-radius: 12px; padding: 0 14px; height: 50px; }
.as-input i { color: #8b97ad; }
.as-input input { flex: 1; background: transparent; border: 0; outline: 0; color: #fff; font: inherit; letter-spacing: .5px; }
.as-input:focus-within { border-color: #4f8ef7; }
.as-btn { height: 48px; border: 0; border-radius: 12px; color: #fff; font: inherit; font-weight: 600; cursor: pointer; display: flex; gap: 8px; align-items: center; justify-content: center; background: #34d399; color: #04261a; }
.as-btn.salida { background: #f05454; color: #fff; }
.as-btn:disabled { opacity: .5; cursor: not-allowed; }
.as-err { background: rgba(240,84,84,.12); color: #ff8f8f; border-radius: 10px; padding: 10px 12px; font-size: 13px; display: flex; gap: 8px; align-items: center; }
.as-emp { display: flex; align-items: center; gap: 12px; background: #0f1320; border-radius: 14px; padding: 10px; }
.as-emp div:not(.av) { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.as-emp span { font-size: 12px; color: #8b97ad; }
.as-foto { width: 52px; height: 52px; border-radius: 14px; object-fit: cover; }
.as-foto.av { display: grid; place-items: center; background: #4f8ef7; font-weight: 600; }
.as-x { background: transparent; border: 0; color: #8b97ad; cursor: pointer; font-size: 18px; }
.as-cam { position: relative; border-radius: 16px; overflow: hidden; background: #000; aspect-ratio: 4/3; }
.as-cam video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
.as-ov { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,.55); font-size: 40px; }
.as-ov p { font-size: 14px; margin: 6px 0 0; }
.as-ov.ok { color: #34d399; } .as-ov.fail { color: #f05454; }
.as-sin { text-align: center; color: #8b97ad; font-size: 13px; } .as-sin i { font-size: 44px; opacity: .7; }
.as-msg { text-align: center; font-size: 13px; color: #8b97ad; margin: 0; }
.as-msg.ok { color: #34d399; } .as-msg.fail { color: #ff8f8f; }
.as-dl { width: 100%; max-width: 440px; }
.as-foot { font-size: 11px; color: #5b667c; }
.spin { animation: sp 1s linear infinite; } @keyframes sp { to { transform: rotate(360deg); } }
</style>
