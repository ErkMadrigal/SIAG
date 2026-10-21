<template>
  <div class="bio-view">

    <!-- Header con tabs -->
    <div class="bio-header">
      <div>
        <h1 class="view-title">Biométrico</h1>
        <p class="view-sub">Registro de entrada y salida con reconocimiento facial (TensorFlow.js)</p>
      </div>
    </div>

    <!-- Tabs entrada/salida -->
    <div class="tabs-bar">
      <button class="tab-btn" :class="{ active: modo === 'entrada' }" @click="cambiarModo('entrada')">
        <i class="ti ti-login" aria-hidden="true"></i>
        Entrada
      </button>
      <button class="tab-btn" :class="{ active: modo === 'salida' }" @click="cambiarModo('salida')">
        <i class="ti ti-logout" aria-hidden="true"></i>
        Salida
      </button>
    </div>

    <!-- Panel principal -->
    <div class="bio-layout">

      <!-- Buscador -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-id" aria-hidden="true"></i>
          <span>Ingresa tu CURP o RFC</span>
        </div>
        <div class="sec-body">
          <div class="search-row">
            <div class="search-input-wrap">
              <i class="ti ti-key" aria-hidden="true"></i>
              <input
                v-model="query"
                :placeholder="'CURP o RFC · Captura de ' + (modo === 'entrada' ? 'Entrada' : 'Salida')"
                @keydown.enter="buscarEmpleado"
                :disabled="buscando || empleado"
                @input="query = query.toUpperCase()"
              />
            </div>
            <button class="btn-primary-lg" @click="buscarEmpleado" :disabled="buscando || !query || !!empleado">
              <i class="ti ti-loader-2 spin" v-if="buscando" aria-hidden="true"></i>
              <i class="ti ti-search" v-else aria-hidden="true"></i>
              {{ buscando ? 'Buscando...' : 'Buscar' }}
            </button>
            <button v-if="empleado" class="btn-sm" @click="resetTodo">
              <i class="ti ti-refresh" aria-hidden="true"></i> Nuevo
            </button>
          </div>

          <!-- Error busqueda -->
          <div v-if="errorBusqueda" class="alert-error">
            <i class="ti ti-alert-circle" aria-hidden="true"></i>
            {{ errorBusqueda }}
          </div>
        </div>
      </div>

      <!-- Panel empleado + cámara -->
      <template v-if="empleado">
        <div class="bio-two-col">

          <!-- Info empleado -->
          <div class="sec">
            <div class="sec-hdr">
              <i class="ti ti-user" aria-hidden="true"></i>
              <span>Empleado encontrado</span>
              <span class="modo-badge" :class="modo">
                {{ modo === 'entrada' ? '↑ Entrada' : '↓ Salida' }}
              </span>
            </div>
            <div class="emp-card">
              <div class="emp-foto-wrap">
                <img v-if="empleado.fotos" :src="empleado.fotos" class="emp-foto" />
                <div v-else class="emp-av-lg">{{ getInitials(empleado.nombreCompleto) }}</div>
                <!-- Overlay resultado -->
                <div v-if="resultadoFacial" class="foto-overlay" :class="resultadoFacial">
                  <i :class="['ti', resultadoFacial === 'ok' ? 'ti-circle-check' : 'ti-circle-x']"></i>
                </div>
              </div>
              <div class="emp-data">
                <h2 class="emp-nombre">{{ empleado.nombreCompleto }}</h2>
                <div class="emp-badges">
                  <span class="emp-badge">No. {{ String(empleado.id).padStart(6,'0') }}</span>
                  <span class="emp-badge" v-if="empleado.puesto">{{ empleado.puesto }}</span>
                </div>
                <div class="emp-keys">
                  <div class="emp-key"><span class="key-label">CURP</span><span class="key-val mono">{{ empleado.curp || '—' }}</span></div>
                  <div class="emp-key"><span class="key-label">RFC</span><span class="key-val mono">{{ empleado.rfc || '—' }}</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cámara -->
          <div class="sec">
            <div class="sec-hdr">
              <i class="ti ti-camera" aria-hidden="true"></i>
              <span>Verificación facial</span>
              <span v-if="camaraActiva" class="cam-dot"></span>
            </div>
            <!-- Sin rostro enrolado -->
            <div v-if="Number(empleado.rostro_enrolado) !== 1 || !descriptorRef" class="cam-wrap sin-enrolar">
              <i class="ti ti-face-id-error" style="font-size:46px;opacity:.7"></i>
              <p class="sin-enrolar-t">Este empleado todavía no tiene rostro enrolado</p>
              <p class="sin-enrolar-s">El registro por reconocimiento facial necesita que primero se enrole su rostro.</p>
              <button v-if="auth.esAdmin" class="btn-primary-lg" @click="showEnrolar = true">
                <i class="ti ti-camera" aria-hidden="true"></i> Enrolar rostro ahora
              </button>
              <p v-else class="sin-enrolar-s">Solo un administrador puede enrolarlo (desde su perfil, con el botón de enrolar o copiando su link).</p>
            </div>

            <div v-else class="cam-wrap">
              <video ref="videoRef" autoplay muted playsinline class="cam-video"></video>

              <!-- Estado procesando -->
              <div v-if="procesando" class="cam-overlay procesando">
                <i class="ti ti-loader-2 spin" style="font-size:36px"></i>
                <p>Comparando rostros...</p>
              </div>

              <!-- Resultado OK -->
              <div v-if="resultadoFacial === 'ok'" class="cam-overlay success">
                <i class="ti ti-circle-check" style="font-size:48px"></i>
                <p>¡Rostro verificado!</p>
              </div>

              <!-- Resultado FAIL -->
              <div v-if="resultadoFacial === 'fail'" class="cam-overlay fail">
                <i class="ti ti-circle-x" style="font-size:48px"></i>
                <p>Rostro no coincide</p>
              </div>
            </div>

            <div class="cam-actions">
              <button
                class="btn-capture"
                :class="modo"
                :disabled="procesando || !camaraActiva || !descriptorRef || resultadoFacial === 'ok'"
                @click="leerRostro"
              >
                <i class="ti ti-loader-2 spin" v-if="procesando" aria-hidden="true"></i>
                <i class="ti ti-aperture" v-else aria-hidden="true"></i>
                {{ procesando ? 'Procesando...' : 'Leer rostro' }}
              </button>

              <p v-if="mensajeResultado" class="resultado-msg" :class="resultadoFacial">
                {{ mensajeResultado }}
              </p>
            </div>
          </div>

        </div>
      </template>

      <!-- Estado inicial -->
      <div v-else class="bio-placeholder">
        <div class="placeholder-icon" :class="modo">
          <i :class="['ti', modo === 'entrada' ? 'ti-login' : 'ti-logout']" aria-hidden="true"></i>
        </div>
        <p class="placeholder-title">Captura de {{ modo === 'entrada' ? 'Entrada' : 'Salida' }}</p>
        <p class="placeholder-sub">Ingresa tu CURP o RFC para iniciar el proceso de verificación facial</p>
      </div>

    </div>

    <!-- Enrolar rostro desde la vista de biométrico -->
    <Teleport to="body">
      <div v-if="showEnrolar && empleado" class="enr-overlay" @click.self="showEnrolar = false">
        <div class="enr-box">
          <div class="enr-hdr">
            <div>
              <strong>Enrolar rostro</strong>
              <span>{{ empleado.nombreCompleto }}</span>
            </div>
            <button class="enr-x" @click="showEnrolar = false"><i class="ti ti-x"></i></button>
          </div>
          <EnrolarRostro :submit="enrolarDesdeAqui" @done="onEnrolado" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { useAuthStore } from '@/stores/auth.js'
import { usePermisos } from '@/composables/usePermisos.js'
import api from '@/services/api.js'
import { empleadosService } from '@/services/empleados.service.js'
import EnrolarRostro from '@/components/ui/EnrolarRostro.vue'
import { cargarModelos, descriptorDesdeVideo, compararDescriptores } from '@/composables/useFaceEnroll.js'

const ui   = useUiStore()
const auth = useAuthStore()
const { can } = usePermisos()

const modo             = ref('entrada')
const query            = ref('')
const buscando         = ref(false)
const procesando       = ref(false)
const camaraActiva     = ref(false)
const empleado         = ref(null)
const errorBusqueda    = ref('')
const resultadoFacial  = ref('') // '' | 'ok' | 'fail'
const mensajeResultado = ref('')
const showEnrolar      = ref(false)

const videoRef  = ref(null)
let   stream    = null
const descriptorRef = ref(null)   // descriptor ENROLADO del empleado (TensorFlow.js)

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home',      to: '/' },
    { label: 'Biométrico', to: '/biometrico' }
  ])
})

onUnmounted(() => detenerCamara())

function cambiarModo(m) {
  modo.value = m
  resetTodo()
}

function resetTodo() {
  query.value           = ''
  empleado.value        = null
  errorBusqueda.value   = ''
  resultadoFacial.value = ''
  mensajeResultado.value = ''
  descriptorRef.value   = null
  detenerCamara()
}

// ── Buscar empleado ──────────────────────────────────
async function buscarEmpleado() {
  if (!query.value.trim()) return
  buscando.value      = true
  errorBusqueda.value = ''
  empleado.value      = null
  resultadoFacial.value = ''
  mensajeResultado.value = ''

  try {
    const { data } = await api.post('/auth/biometrico/buscar', { query: query.value.trim() })
    const emp = data.data?.[0] || data.data
    if (!emp) {
      errorBusqueda.value = data.message || 'Empleado no encontrado'
      return
    }
    empleado.value = emp
    await prepararReconocimiento()
  } catch (err) {
    errorBusqueda.value = err.response?.data?.message || 'Empleado no encontrado'
  } finally { buscando.value = false }
}

// Carga el rostro enrolado + modelos + cámara. Si no está enrolado,
// se ofrece enrolarlo ahí mismo.
async function prepararReconocimiento() {
  descriptorRef.value = null
  const e = empleado.value
  if (!e || Number(e.rostro_enrolado) !== 1 || !e.descriptor_servidor) return

  try {
    descriptorRef.value = JSON.parse(e.descriptor_servidor)
  } catch {
    descriptorRef.value = null
    return
  }
  mensajeResultado.value = 'Cargando modelos de IA...'
  try {
    await cargarModelos()
    mensajeResultado.value = ''
    await nextTick()          // espera a que se pinte el <video>
    await iniciarCamara()
  } catch (err) {
    mensajeResultado.value = 'No se pudieron cargar los modelos de reconocimiento'
  }
}

// ── Cámara ───────────────────────────────────────────
async function iniciarCamara() {
  if (camaraActiva.value) return
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }
    camaraActiva.value = true
  } catch (err) {
    console.error('Error cámara:', err)
    errorBusqueda.value = 'No se pudo acceder a la cámara'
  }
}

function detenerCamara() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
  camaraActiva.value = false
}

// ── Enrolar desde aquí si todavía no tiene rostro ────
const enrolarDesdeAqui = (d1, d2) =>
  empleadosService.enrolarRostro(empleado.value.id, d1, d2)
    .catch(e => e?.response?.data || { status: 'error', message: 'Error de conexión' })

async function onEnrolado() {
  showEnrolar.value = false
  // recarga el empleado para traer el descriptor recién guardado
  const q = String(empleado.value.id).padStart(6, '0')
  query.value = q
  empleado.value = null
  await buscarEmpleado()
}

// ── Leer rostro (TensorFlow.js) ──────────────────────
async function leerRostro() {
  if (!descriptorRef.value) {
    mensajeResultado.value = 'Este empleado no tiene rostro enrolado'
    return
  }
  procesando.value = true
  resultadoFacial.value  = ''
  mensajeResultado.value = 'Analizando rostro...'

  try {
    const inicio = performance.now()
    const capturado = await descriptorDesdeVideo(videoRef.value)
    if (!capturado) {
      resultadoFacial.value  = 'fail'
      mensajeResultado.value = 'No se detectó el rostro. Acércate y busca buena luz.'
      return
    }
    const r  = compararDescriptores(descriptorRef.value, capturado)
    const ms = Math.round(performance.now() - inicio)

    if (r.similar) {
      resultadoFacial.value  = 'ok'
      mensajeResultado.value = `Coincide — ${(r.score * 100).toFixed(1)}% (${ms} ms)`
      await registrarAsistencia()
    } else {
      resultadoFacial.value  = 'fail'
      mensajeResultado.value = `Rostro no coincide (${(r.score * 100).toFixed(1)}%). Acceso denegado.`
    }
  } catch (err) {
    resultadoFacial.value  = 'fail'
    mensajeResultado.value = 'Error: ' + err.message
  } finally { procesando.value = false }
}

// ── Registrar asistencia ─────────────────────────────
async function registrarAsistencia() {
  try {
    const ip = await obtenerIP()
    const coords = await obtenerGeo()

    const { data } = await api.post('/biometrico/registro', {
      id_empleado:   empleado.value.id,
      lat:           coords.lat,
      lon:           coords.lon,
      ip,
      salida:        modo.value === 'salida',
      id_capturista: auth.user?.id ?? 0,
    })

    if (data?.status === 'bloqueado') {
      resultadoFacial.value  = 'fail'
      mensajeResultado.value = `No puede salir todavía. Faltan ${data.data?.tiempo_restante ?? ''}`
      return
    }

    const accion = modo.value === 'entrada' ? 'Entrada' : 'Salida'
    mensajeResultado.value = `✓ ${accion} registrada exitosamente`
    detenerCamara()

    setTimeout(() => resetTodo(), 3000)

  } catch (err) {
    const d = err.response?.data
    mensajeResultado.value = err.response?.status === 423
      ? `No puede salir todavía. Faltan ${d?.data?.tiempo_restante ?? ''}`
      : (d?.message || (err.code === 1 ? 'Activa la ubicación (GPS) del navegador' : 'Error al registrar asistencia'))
    resultadoFacial.value  = 'fail'
  }
}

async function obtenerIP() {
  try {
    const res  = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data.ip
  } catch { return 'No disponible' }
}

function obtenerGeo() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}

function getInitials(nombre) {
  if (!nombre) return 'US'
  return nombre.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()
}
</script>

<style scoped>
.bio-view   { display: flex; flex-direction: column; gap: 14px; }
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }

/* Tabs */
.tabs-bar {
  display: flex; gap: 4px;
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; padding: 6px; width: fit-content;
}
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 8px; border: none;
  background: transparent; font-size: 13px; color: var(--tx2);
  cursor: pointer; transition: all .15s; font-family: inherit;
}
.tab-btn:hover { background: var(--bg2); color: var(--tx0); }
.tab-btn.active.entrada { background: var(--grn-dim); color: var(--grn); font-weight: 500; }
.tab-btn.active.salida  { background: var(--red-dim);  color: var(--red);  font-weight: 500; }
.tab-btn i { font-size: 16px; }

/* Layout */
.bio-layout    { display: flex; flex-direction: column; gap: 14px; }
.bio-two-col   { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

/* Sección */
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 0.5px solid var(--bdr);
  font-size: 13px; font-weight: 500; color: var(--tx0);
}
.sec-hdr i { font-size: 16px; color: var(--acc); }
.sec-body  { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

/* Modo badge */
.modo-badge {
  margin-left: auto; font-size: 11px; padding: 2px 8px;
  border-radius: 20px; font-weight: 500;
}
.modo-badge.entrada { background: var(--grn-dim); color: var(--grn); }
.modo-badge.salida  { background: var(--red-dim);  color: var(--red); }

/* Cam dot */
.cam-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--red);
  margin-left: auto; animation: blink 1s ease-in-out infinite;
}
@keyframes blink { 0%,100% { opacity:1; } 50% { opacity:.3; } }

/* Buscador */
.search-row {
  display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
}
.search-input-wrap {
  display: flex; align-items: center; gap: 8px; flex: 1;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 0 12px; height: 42px;
  transition: border .15s;
}
.search-input-wrap:focus-within { border-color: var(--acc); }
.search-input-wrap i { font-size: 16px; color: var(--tx2); flex-shrink: 0; }
.search-input-wrap input {
  background: transparent; border: none; outline: none;
  font-size: 14px; color: var(--tx0); width: 100%;
  font-family: inherit; letter-spacing: 1px;
}
.search-input-wrap input::placeholder { color: var(--tx3); letter-spacing: 0; }

/* Alert */
.alert-error {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 8px;
  background: var(--red-dim); border: 0.5px solid var(--red);
  color: var(--red); font-size: 13px;
}

/* Emp card */
.emp-card {
  display: flex; gap: 16px; padding: 16px; align-items: flex-start;
}
.emp-foto-wrap { position: relative; flex-shrink: 0; }
.emp-foto {
  width: 100px; height: 100px; border-radius: 12px; object-fit: cover;
  border: 2px solid var(--bdr2);
}
.emp-av-lg {
  width: 100px; height: 100px; border-radius: 12px;
  background: var(--acc-dim); color: var(--acc);
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; font-weight: 600;
}
.foto-overlay {
  position: absolute; inset: 0; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px;
}
.foto-overlay.ok   { background: rgba(34,201,122,.5); color: #22c97a; }
.foto-overlay.fail { background: rgba(240,84,84,.5);  color: #f05454; }
.emp-data  { flex: 1; }
.emp-nombre { font-size: 16px; font-weight: 600; color: var(--tx0); margin-bottom: 8px; }
.emp-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.emp-badge {
  font-size: 11px; padding: 2px 8px; border-radius: 20px;
  background: var(--bg3); color: var(--tx1); border: 0.5px solid var(--bdr2);
}
.emp-keys { display: flex; flex-direction: column; gap: 4px; }
.emp-key  { display: flex; gap: 8px; align-items: center; }
.key-label { font-size: 10px; color: var(--tx3); min-width: 36px; }
.key-val   { font-size: 12px; color: var(--tx1); }
.mono { font-family: monospace; }

/* Cámara */
.cam-wrap {
  position: relative; background: #000; overflow: hidden;
  min-height: 240px; max-height: 320px;
}
.cam-video {
  width: 100%; height: 100%; object-fit: cover;
  min-height: 240px; max-height: 320px; display: block;
  transform: scaleX(-1); /* corrige espejo cámara frontal */
  background: #000;
}
.cam-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; font-size: 14px; font-weight: 500;
}
.cam-overlay.procesando { background: rgba(0,0,0,.6); color: #fff; }
.cam-overlay.success    { background: rgba(13,46,31,.85); color: #22c97a; }
.cam-overlay.fail       { background: rgba(46,16,16,.85); color: #f05454; }
.cam-actions {
  padding: 12px 16px; display: flex; flex-direction: column; gap: 8px;
  border-top: 0.5px solid var(--bdr);
}
.btn-capture {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12px; border-radius: 10px; border: none;
  font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.btn-capture.entrada { background: var(--grn); color: #fff; }
.btn-capture.salida  { background: var(--red);  color: #fff; }
.btn-capture:hover:not(:disabled) { opacity: .85; }
.btn-capture:disabled { opacity: .5; cursor: not-allowed; }
.resultado-msg { font-size: 13px; text-align: center; padding: 0 4px; }
.resultado-msg.ok   { color: var(--grn); }
.resultado-msg.fail { color: var(--red); }

/* Placeholder */
.bio-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px; text-align: center;
  background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px;
}
.placeholder-icon {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 30px;
}
.placeholder-icon.entrada { background: var(--grn-dim); color: var(--grn); }
.placeholder-icon.salida  { background: var(--red-dim);  color: var(--red);  }
.placeholder-title { font-size: 16px; font-weight: 500; color: var(--tx0); }
.placeholder-sub   { font-size: 13px; color: var(--tx2); max-width: 360px; line-height: 1.6; }

/* Botones */
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer; transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .bio-two-col { grid-template-columns: 1fr; }
  .emp-card    { flex-direction: column; align-items: center; text-align: center; }
}

.cam-wrap.sin-enrolar { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  text-align: center; padding: 28px 18px; aspect-ratio: auto; min-height: 260px; max-height: none; }
.sin-enrolar-t { margin: 0; font-size: 14px; font-weight: 600; color: var(--tx0); }
.sin-enrolar-s { margin: 0; font-size: 12px; color: var(--tx2); max-width: 300px; }
.enr-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.6); display: grid; place-items: center; padding: 16px; }
.enr-box { width: 100%; max-width: 480px; background: var(--bg1); border: 0.5px solid var(--bdr2); border-radius: 18px; padding: 18px; max-height: 94vh; overflow-y: auto; }
.enr-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.enr-hdr strong { display: block; font-size: 15px; color: var(--tx0); }
.enr-hdr span { font-size: 12px; color: var(--tx2); }
.enr-x { background: none; border: none; color: var(--tx2); font-size: 18px; cursor: pointer; }
</style>
