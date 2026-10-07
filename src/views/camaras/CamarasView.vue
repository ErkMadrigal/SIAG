<template>
  <div class="cam-view">

    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Cámaras</h1>
        <p class="view-sub">Cámaras georreferenciadas y tickets de falla</p>
      </div>
      <div class="tabs-wrap">
        <button class="tab-btn" :class="{ active: tab === 'mapa' }" @click="cambiarTab('mapa')">
          <i class="ti ti-map-2"></i> Mapa
        </button>
        <button class="tab-btn" :class="{ active: tab === 'tabla' }" @click="cambiarTab('tabla')">
          <i class="ti ti-list"></i> Cámaras
        </button>
        <button class="tab-btn" :class="{ active: tab === 'tickets' }" @click="cambiarTab('tickets')">
          <i class="ti ti-ticket"></i> Tickets
          <span v-if="resumen.tickets.abiertos" class="tab-count">{{ resumen.tickets.abiertos }}</span>
        </button>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-primary-lg" @click="abrirNueva"><i class="ti ti-plus"></i> Nueva cámara</button>
        <button class="btn-sm" @click="recargar" title="Recargar"><i class="ti ti-refresh"></i></button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpis">
      <div class="kpi"><span class="kpi-n">{{ resumen.camaras.total || 0 }}</span><span class="kpi-l">Cámaras</span></div>
      <div class="kpi ok"><span class="kpi-n">{{ resumen.camaras.activas || 0 }}</span><span class="kpi-l">Activas</span></div>
      <div class="kpi bad"><span class="kpi-n">{{ resumen.camaras.con_falla || 0 }}</span><span class="kpi-l">Con falla</span></div>
      <div class="kpi mute"><span class="kpi-n">{{ resumen.camaras.inactivas || 0 }}</span><span class="kpi-l">Inactivas</span></div>
      <div class="kpi warn"><span class="kpi-n">{{ resumen.tickets.abiertos || 0 }}</span><span class="kpi-l">Tickets abiertos</span></div>
      <div class="kpi info"><span class="kpi-n">{{ resumen.tickets.en_proceso || 0 }}</span><span class="kpi-l">En proceso</span></div>
    </div>

    <!-- Filtros (mapa y tabla) -->
    <div class="sec" v-show="tab !== 'tickets'">
      <div class="toolbar">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input v-model="filtros.q" placeholder="Buscar por nombre o dirección..." @input="debounceCargar" />
          <button v-if="filtros.q" class="clear-btn" @click="filtros.q = ''; cargarCamaras()"><i class="ti ti-x"></i></button>
        </div>
        <div class="toolbar-right">
          <select class="sel" v-model="filtros.estado" @change="cargarCamaras">
            <option value="">Todos los estados</option>
            <option v-for="e in resumen.estados" :key="e.estado" :value="e.estado">{{ e.estado }} ({{ e.total }})</option>
          </select>
          <select class="sel" v-model="filtros.estatus" @change="cargarCamaras">
            <option value="">Todos los estatus</option>
            <option value="activa">Activas</option>
            <option value="con_falla">Con falla</option>
            <option value="inactiva">Inactivas</option>
          </select>
        </div>
      </div>

      <!-- MAPA -->
      <div v-show="tab === 'mapa'" class="map-wrap">
        <div ref="mapEl" class="map"></div>
        <div v-if="errorMapa" class="map-error"><i class="ti ti-wifi-off"></i> {{ errorMapa }}</div>
        <div class="map-legend">
          <span><i class="dot ok"></i> Activa</span>
          <span><i class="dot bad"></i> Con falla</span>
          <span><i class="dot mute"></i> Inactiva</span>
        </div>
      </div>

      <!-- TABLA -->
      <div v-show="tab === 'tabla'">
        <div v-if="loading" class="skeleton-wrap"><div class="skeleton-row" v-for="i in 6" :key="i"></div></div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cámara</th><th>Estado</th><th>Dirección</th><th>Coordenadas</th>
                <th style="text-align:center">Estatus</th><th style="text-align:center">Tickets</th>
                <th style="text-align:center;width:90px">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in camaras" :key="c.id" @click="abrirCamara(c.id)" style="cursor:pointer">
                <td class="strong">{{ c.nombre }}</td>
                <td>{{ c.estado || '—' }}</td>
                <td class="desc-cell" :title="c.direccion">{{ c.direccion || '—' }}</td>
                <td class="mono small">{{ Number(c.latitud).toFixed(5) }}, {{ Number(c.longitud).toFixed(5) }}</td>
                <td style="text-align:center"><span class="pill" :class="c.estatus">{{ etiquetaEstatus(c.estatus) }}</span></td>
                <td style="text-align:center">{{ c.tickets_abiertos || 0 }}</td>
                <td @click.stop style="text-align:center">
                  <a class="icon-btn" :href="gmaps(c)" target="_blank" rel="noopener" title="Abrir en Google Maps"><i class="ti ti-map-pin"></i></a>
                  <button class="icon-btn accent" @click="abrirCamara(c.id)" title="Ver"><i class="ti ti-eye"></i></button>
                </td>
              </tr>
              <tr v-if="!camaras.length">
                <td colspan="7" class="empty-row">
                  <i class="ti ti-camera-off" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>
                  No hay cámaras registradas. Se dan de alta desde la app del kiosko, parado frente a la cámara.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TICKETS -->
    <div class="sec" v-show="tab === 'tickets'">
      <div class="toolbar">
        <div class="toolbar-right" style="margin-left:0">
          <select class="sel" v-model="filtroTicket" @change="cargarTickets">
            <option value="">Todos</option>
            <option value="abierto">Abiertos</option>
            <option value="en_proceso">En proceso</option>
            <option value="resuelto">Resueltos</option>
          </select>
        </div>
        <button class="btn-primary-lg" style="margin-left:auto" @click="abrirNuevoTicket">
          <i class="ti ti-ticket"></i> Nuevo ticket
        </button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:70px">#</th><th>Cámara</th><th>Estado</th><th>Falla</th>
              <th>Descripción</th><th>Levantó</th><th>Fecha</th><th style="text-align:center">Estatus</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tickets" :key="t.id" @click="abrirTicket(t.id)" style="cursor:pointer">
              <td class="mono">#{{ t.id }}</td>
              <td class="strong">{{ t.camara }}</td>
              <td>{{ t.estado || '—' }}</td>
              <td><span class="tipo-pill">{{ etiquetaFalla(t.tipo_falla) }}</span></td>
              <td class="desc-cell" :title="t.descripcion">{{ t.descripcion || '—' }}</td>
              <td>{{ t.creado_por_nombre || '—' }}</td>
              <td style="color:var(--tx2)">{{ fecha(t.created_at) }}</td>
              <td style="text-align:center"><span class="pill" :class="'t-' + t.estatus">{{ etiquetaTicket(t.estatus) }}</span></td>
            </tr>
            <tr v-if="!tickets.length">
              <td colspan="8" class="empty-row">
                <i class="ti ti-ticket-off" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>
                No hay tickets
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL nueva cámara -->
    <Teleport to="body">
      <div v-if="modalNueva" class="modal-overlay" @click.self="cerrarNueva">
        <div class="modal">
          <div class="modal-hdr">
            <div>
              <h2><i class="ti ti-camera-plus"></i> Nueva cámara</h2>
              <p>Haz clic en el mapa para colocar la cámara, usa tu ubicación o escribe las coordenadas.</p>
            </div>
            <button class="btn-close" @click="cerrarNueva"><i class="ti ti-x"></i></button>
          </div>
          <div class="modal-body">
            <div ref="mapaPickEl" class="map-pick"></div>
            <div class="form-grid" style="margin-top:10px">
              <input class="inp" type="number" step="any" v-model="form.latitud" placeholder="Latitud" @change="desdeInputs" />
              <input class="inp" type="number" step="any" v-model="form.longitud" placeholder="Longitud" @change="desdeInputs" />
              <button class="btn-sm" @click="usarMiUbicacion" :disabled="buscandoGps">
                <i class="ti ti-loader-2 spin" v-if="buscandoGps"></i><i class="ti ti-current-location" v-else></i> Mi ubicación
              </button>
            </div>

            <div class="form-col">
              <label class="lbl">Nombre de la cámara *</label>
              <input class="inp" v-model="form.nombre" placeholder="Ej. CDMX - Reforma 222 - Cam 03" />
              <label class="lbl">
                Estado
                <span v-if="detectando" class="det"><i class="ti ti-loader-2 spin"></i> detectando...</span>
                <span v-else-if="autoDetectado" class="det ok"><i class="ti ti-sparkles"></i> detectado por ubicación</span>
              </label>
              <select class="inp" v-model="form.estado" @change="estadoManual = true">
                <option value="">Seleccione</option>
                <option v-for="e in ESTADOS_MX" :key="e" :value="e">{{ e }}</option>
              </select>
              <label class="lbl">Dirección / referencia</label>
              <input class="inp" v-model="form.direccion" placeholder="Se detecta sola al marcar el punto; puedes corregirla"
                     @input="direccionManual = true" />
              <label class="lbl">Notas</label>
              <input class="inp" v-model="form.notas" placeholder="Opcional" />
              <label class="lbl">Foto (opcional)</label>
              <FotoInput v-model="fotoCam" texto="Subir foto de la cámara" />
            </div>

            <p v-if="msgError" class="msg-err">{{ msgError }}</p>
            <div style="display:flex;justify-content:flex-end;margin-top:14px">
              <button class="btn-primary-lg" :disabled="guardando" @click="guardarNueva">
                <i class="ti ti-loader-2 spin" v-if="guardando"></i><i class="ti ti-check" v-else></i> Guardar cámara
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL nuevo ticket -->
    <Teleport to="body">
      <div v-if="modalNuevoTicket" class="modal-overlay" @click.self="modalNuevoTicket = false">
        <div class="modal">
          <div class="modal-hdr">
            <div>
              <h2><i class="ti ti-ticket"></i> Nuevo ticket de falla</h2>
              <p>Elige la cámara y describe qué le pasa.</p>
            </div>
            <button class="btn-close" @click="modalNuevoTicket = false"><i class="ti ti-x"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-col">
              <label class="lbl">Cámara *</label>
              <input class="inp" v-model="tk.q" placeholder="Buscar cámara por nombre o estado..." />
              <select class="inp" v-model="tk.id_camara" size="6">
                <option v-for="c in camarasParaTicket" :key="c.id" :value="c.id">
                  {{ c.nombre }}{{ c.estado ? ' · ' + c.estado : '' }}
                </option>
              </select>
              <label class="lbl">Tipo de falla</label>
              <select class="inp" v-model="tk.tipo_falla">
                <option v-for="(l, k) in TIPOS_FALLA" :key="k" :value="k">{{ l }}</option>
              </select>
              <label class="lbl">Descripción</label>
              <input class="inp" v-model="tk.descripcion" placeholder="Ej. Se va la señal por las tardes" />
              <label class="lbl">Foto (opcional)</label>
              <FotoInput v-model="fotoTk" texto="Subir foto de la falla" />
            </div>
            <p v-if="msgError" class="msg-err">{{ msgError }}</p>
            <div style="display:flex;justify-content:flex-end;margin-top:14px">
              <button class="btn-primary-lg" :disabled="guardando" @click="guardarNuevoTicket">
                <i class="ti ti-loader-2 spin" v-if="guardando"></i><i class="ti ti-check" v-else></i> Levantar ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL cámara -->
    <Teleport to="body">
      <div v-if="modalCamara" class="modal-overlay" @click.self="modalCamara = null">
        <div class="modal">
          <div class="modal-hdr">
            <div>
              <h2><i class="ti ti-camera"></i> {{ modalCamara.data.nombre }}</h2>
              <p>{{ modalCamara.data.estado || 'Sin estado' }} · <span class="pill" :class="modalCamara.data.estatus">{{ etiquetaEstatus(modalCamara.data.estatus) }}</span></p>
            </div>
            <button class="btn-close" @click="modalCamara = null"><i class="ti ti-x"></i></button>
          </div>
          <div class="modal-body">
            <div class="cam-top">
              <img v-if="modalCamara.data.foto_url" :src="modalCamara.data.foto_url" class="cam-foto" />
              <div v-else class="cam-foto vacio"><i class="ti ti-camera-off"></i></div>
              <div class="cam-datos">
                <div><label>Coordenadas</label>
                  <span class="mono">{{ Number(modalCamara.data.latitud).toFixed(6) }}, {{ Number(modalCamara.data.longitud).toFixed(6) }}</span></div>
                <div v-if="modalCamara.data.precision_m"><label>Precisión GPS al alta</label>±{{ Number(modalCamara.data.precision_m).toFixed(0) }} m</div>
                <div><label>Dirección</label>{{ modalCamara.data.direccion || '—' }}</div>
                <div v-if="modalCamara.data.notas"><label>Notas</label>{{ modalCamara.data.notas }}</div>
                <a class="btn-sm" :href="gmaps(modalCamara.data)" target="_blank" rel="noopener">
                  <i class="ti ti-map-pin"></i> Abrir en Google Maps</a>
              </div>
            </div>

            <div class="blk-title"><i class="ti ti-ticket"></i> Tickets ({{ modalCamara.tickets.length }})</div>
            <div v-if="!modalCamara.tickets.length" class="muted-txt">Sin tickets para esta cámara</div>
            <div v-for="t in modalCamara.tickets" :key="t.id" class="tk-row" @click="abrirTicket(t.id)">
              <span class="mono">#{{ t.id }}</span>
              <span class="tipo-pill">{{ etiquetaFalla(t.tipo_falla) }}</span>
              <span class="tk-desc">{{ t.descripcion || '—' }}</span>
              <span class="pill" :class="'t-' + t.estatus">{{ etiquetaTicket(t.estatus) }}</span>
            </div>

            <div class="blk-title" style="margin-top:18px"><i class="ti ti-alert-triangle"></i> Levantar ticket de falla</div>
            <div class="form-grid">
              <select v-model="nuevoTicket.tipo_falla" class="inp">
                <option v-for="(l, k) in TIPOS_FALLA" :key="k" :value="k">{{ l }}</option>
              </select>
              <input class="inp" v-model="nuevoTicket.descripcion" placeholder="Describe la falla (opcional)" />
              <button class="btn-primary-lg" :disabled="guardando" @click="crearTicket">
                <i class="ti ti-loader-2 spin" v-if="guardando"></i><i class="ti ti-plus" v-else></i> Crear ticket
              </button>
            </div>
            <p v-if="msgError" class="msg-err">{{ msgError }}</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL ticket -->
    <Teleport to="body">
      <div v-if="modalTicket" class="modal-overlay" @click.self="modalTicket = null">
        <div class="modal">
          <div class="modal-hdr">
            <div>
              <h2><i class="ti ti-ticket"></i> Ticket #{{ modalTicket.data.id }} · {{ modalTicket.data.camara }}</h2>
              <p>{{ etiquetaFalla(modalTicket.data.tipo_falla) }} ·
                <span class="pill" :class="'t-' + modalTicket.data.estatus">{{ etiquetaTicket(modalTicket.data.estatus) }}</span></p>
            </div>
            <button class="btn-close" @click="modalTicket = null"><i class="ti ti-x"></i></button>
          </div>
          <div class="modal-body">
            <p class="tk-desc-full">{{ modalTicket.data.descripcion || 'Sin descripción' }}</p>
            <img v-if="modalTicket.data.foto_url" :src="modalTicket.data.foto_url" class="tk-foto" />
            <p class="muted-txt">Levantado por {{ modalTicket.data.creado_por_nombre || '—' }} el {{ fecha(modalTicket.data.created_at) }}</p>

            <div class="blk-title"><i class="ti ti-history"></i> Bitácora</div>
            <div v-if="!modalTicket.bitacora.length" class="muted-txt">Sin movimientos todavía</div>
            <div v-for="b in modalTicket.bitacora" :key="b.id" class="bit-row">
              <div class="bit-head">
                <strong>{{ b.autor || 'Sistema' }}</strong>
                <span class="muted-txt">{{ fecha(b.created_at) }}</span>
                <span v-if="b.estatus_nuevo" class="pill" :class="'t-' + b.estatus_nuevo">→ {{ etiquetaTicket(b.estatus_nuevo) }}</span>
              </div>
              <div v-if="b.comentario">{{ b.comentario }}</div>
            </div>

            <div class="blk-title" style="margin-top:18px"><i class="ti ti-message"></i> Actualizar</div>
            <div class="form-grid">
              <select v-model="seguimiento.estatus" class="inp">
                <option value="abierto">Abierto</option>
                <option value="en_proceso">En proceso</option>
                <option value="resuelto">Resuelto</option>
              </select>
              <input class="inp" v-model="seguimiento.comentario" placeholder="Comentario (qué se hizo, qué falta...)" />
              <button class="btn-primary-lg" :disabled="guardando" @click="guardarSeguimiento">
                <i class="ti ti-loader-2 spin" v-if="guardando"></i><i class="ti ti-check" v-else></i> Guardar
              </button>
            </div>
            <p v-if="msgError" class="msg-err">{{ msgError }}</p>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { camarasService } from '@/services/camaras.service.js'
import { cargarLeaflet } from '@/composables/useLeaflet.js'
import FotoInput from '@/components/ui/FotoInput.vue'

const TIPOS_FALLA = {
  sin_senal: 'Sin señal',
  intermitencia: 'Intermitencia',
  imagen_borrosa: 'Imagen borrosa',
  danio_fisico: 'Daño físico',
  otro: 'Otro',
}
const COLORES = { activa: '#22c97a', con_falla: '#f05454', inactiva: '#7b8294' }
const ESTADOS_MX = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
  'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas',
]

const tab        = ref('mapa')
const loading    = ref(true)
const guardando  = ref(false)
const msgError   = ref('')
const camaras    = ref([])
const tickets    = ref([])
const filtroTicket = ref('abierto')
const filtros    = reactive({ q: '', estado: '', estatus: '' })
const resumen    = reactive({ camaras: {}, tickets: {}, estados: [] })

const modalCamara = ref(null)
const modalTicket = ref(null)
const nuevoTicket = reactive({ tipo_falla: 'sin_senal', descripcion: '' })
const seguimiento = reactive({ estatus: 'abierto', comentario: '' })

// ── Nueva cámara ──
const modalNueva  = ref(false)
const buscandoGps = ref(false)
const mapaPickEl  = ref(null)
const form  = reactive({ nombre: '', estado: '', direccion: '', notas: '', latitud: '', longitud: '' })
const fotoCam = ref(null)
const detectando    = ref(false)
const autoDetectado = ref(false)
let estadoManual    = false   // si el usuario cambió el estado a mano, ya no se pisa
let direccionManual = false
let geoTimer = null
let precisionGps = null
let pickMap = null
let pickMarker = null

// ── Nuevo ticket (desde la pestaña Tickets) ──
const modalNuevoTicket = ref(false)
const todasCamaras = ref([])
const tk = reactive({ q: '', id_camara: '', tipo_falla: 'sin_senal', descripcion: '' })
const fotoTk = ref(null)
const camarasParaTicket = computed(() => {
  const q = tk.q.trim().toLowerCase()
  return !q ? todasCamaras.value : todasCamaras.value.filter(c =>
    c.nombre.toLowerCase().includes(q) || (c.estado || '').toLowerCase().includes(q))
})

const mapEl    = ref(null)
const errorMapa = ref('')
let map = null
let capa = null
let L = null
let timer = null

onMounted(async () => {
  await Promise.all([cargarResumen(), cargarCamaras(), cargarTickets()])
  iniciarMapa()
})

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null }
  if (pickMap) { pickMap.remove(); pickMap = null }
})

// ───────── Alta de cámara desde el panel ─────────
async function abrirNueva() {
  Object.assign(form, { nombre: '', estado: '', direccion: '', notas: '', latitud: '', longitud: '' })
  fotoCam.value = null
  precisionGps = null
  estadoManual = direccionManual = false
  autoDetectado.value = false
  msgError.value = ''
  modalNueva.value = true
  await nextTick()
  try {
    L = await cargarLeaflet()
    pickMap = L.map(mapaPickEl.value).setView([23.6345, -102.5528], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(pickMap)
    pickMap.on('click', e => { precisionGps = null; setPunto(e.latlng.lat, e.latlng.lng) })
  } catch (e) {
    msgError.value = e.message
  }
}

function setPunto(lat, lng, zoom) {
  form.latitud  = Number(lat).toFixed(7)
  form.longitud = Number(lng).toFixed(7)
  if (!pickMap) return
  if (pickMarker) pickMarker.setLatLng([lat, lng])
  else pickMarker = L.circleMarker([lat, lng], {
    radius: 9, color: '#fff', weight: 2, fillColor: '#4f8ef7', fillOpacity: 0.95
  }).addTo(pickMap)
  if (zoom) pickMap.setView([lat, lng], zoom)

  // Detecta estado y dirección del punto (con pausa para no spamear al
  // hacer varios clics seguidos -- Nominatim pide máx 1 petición por segundo)
  clearTimeout(geoTimer)
  geoTimer = setTimeout(() => autocompletar(lat, lng), 700)
}

async function autocompletar(lat, lng) {
  if (estadoManual && direccionManual) return
  detectando.value = true
  try {
    const g = await camarasService.geocodificar(lat, lng)
    if (!estadoManual && g.estado)       form.estado    = g.estado
    if (!direccionManual && g.direccion) form.direccion = g.direccion
    autoDetectado.value = !!(g.estado || g.direccion)
  } catch (e) {
    console.error('No se pudo detectar la dirección', e)
  } finally { detectando.value = false }
}

function desdeInputs() {
  const lat = parseFloat(form.latitud), lng = parseFloat(form.longitud)
  if (!isNaN(lat) && !isNaN(lng)) { precisionGps = null; setPunto(lat, lng, 16) }
}

function usarMiUbicacion() {
  if (!navigator.geolocation) { msgError.value = 'Tu navegador no soporta geolocalización'; return }
  buscandoGps.value = true
  msgError.value = ''
  navigator.geolocation.getCurrentPosition(
    pos => {
      precisionGps = pos.coords.accuracy
      setPunto(pos.coords.latitude, pos.coords.longitude, 17)
      buscandoGps.value = false
    },
    err => { msgError.value = 'No se pudo obtener tu ubicación: ' + err.message; buscandoGps.value = false },
    { enableHighAccuracy: true, timeout: 20000 }
  )
}

function cerrarNueva() {
  if (pickMap) { pickMap.remove(); pickMap = null; pickMarker = null }
  modalNueva.value = false
}

async function guardarNueva() {
  msgError.value = ''
  if (!form.nombre.trim()) { msgError.value = 'Escribe el nombre de la cámara'; return }
  if (form.latitud === '' || form.longitud === '') { msgError.value = 'Marca la ubicación en el mapa'; return }

  guardando.value = true
  try {
    const fd = new FormData()
    fd.append('nombre', form.nombre.trim())
    fd.append('latitud', form.latitud)
    fd.append('longitud', form.longitud)
    if (precisionGps != null) fd.append('precision_m', precisionGps)
    if (form.estado)    fd.append('estado', form.estado)
    if (form.direccion) fd.append('direccion', form.direccion.trim())
    if (form.notas)     fd.append('notas', form.notas.trim())
    if (fotoCam.value)  fd.append('foto', fotoCam.value)
    await camarasService.create(fd)
    cerrarNueva()
    await recargar()
  } catch (e) {
    msgError.value = e.response?.data?.message || 'No se pudo guardar la cámara'
  } finally { guardando.value = false }
}

// ───────── Ticket nuevo (elige la cámara) ─────────
async function abrirNuevoTicket() {
  Object.assign(tk, { q: '', id_camara: '', tipo_falla: 'sin_senal', descripcion: '' })
  fotoTk.value = null
  msgError.value = ''
  modalNuevoTicket.value = true
  try { todasCamaras.value = await camarasService.getAll() } catch (e) { console.error(e) }
}

async function guardarNuevoTicket() {
  msgError.value = ''
  if (!tk.id_camara) { msgError.value = 'Elige una cámara de la lista'; return }
  guardando.value = true
  try {
    const fd = new FormData()
    fd.append('tipo_falla', tk.tipo_falla)
    fd.append('descripcion', tk.descripcion)
    if (fotoTk.value) fd.append('foto', fotoTk.value)
    await camarasService.crearTicket(tk.id_camara, fd)
    modalNuevoTicket.value = false
    await recargar()
  } catch (e) {
    msgError.value = e.response?.data?.message || 'No se pudo crear el ticket'
  } finally { guardando.value = false }
}

async function iniciarMapa() {
  try {
    L = await cargarLeaflet()
    await nextTick()
    map = L.map(mapEl.value).setView([23.6345, -102.5528], 5) // centro de México
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(map)
    capa = L.layerGroup().addTo(map)
    pintarMarcadores(true)
  } catch (e) {
    errorMapa.value = e.message
  }
}

function pintarMarcadores(ajustar = false) {
  if (!map || !capa) return
  capa.clearLayers()
  const pts = []
  camaras.value.forEach(c => {
    const ll = [Number(c.latitud), Number(c.longitud)]
    pts.push(ll)
    L.circleMarker(ll, {
      radius: 8, color: '#fff', weight: 2, fillColor: COLORES[c.estatus] || '#7b8294', fillOpacity: 0.95
    })
      .bindTooltip(c.nombre)
      .on('click', () => abrirCamara(c.id))
      .addTo(capa)
  })
  if (ajustar && pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 })
}

async function cargarResumen() {
  try {
    const r = await camarasService.resumen()
    resumen.camaras = r.camaras || {}
    resumen.tickets = r.tickets || {}
    resumen.estados = r.estados || []
  } catch (e) { console.error(e) }
}

async function cargarCamaras() {
  loading.value = true
  try {
    camaras.value = await camarasService.getAll({ ...filtros })
    pintarMarcadores(true)
  } catch (e) { console.error(e) } finally { loading.value = false }
}

async function cargarTickets() {
  try { tickets.value = await camarasService.getTickets({ estatus: filtroTicket.value }) }
  catch (e) { console.error(e) }
}

function debounceCargar() {
  clearTimeout(timer)
  timer = setTimeout(cargarCamaras, 350)
}

async function recargar() {
  await Promise.all([cargarResumen(), cargarCamaras(), cargarTickets()])
}

async function cambiarTab(t) {
  tab.value = t
  if (t === 'mapa') { await nextTick(); map?.invalidateSize() }
}

async function abrirCamara(id) {
  msgError.value = ''
  nuevoTicket.tipo_falla = 'sin_senal'
  nuevoTicket.descripcion = ''
  try {
    const r = await camarasService.getById(id)
    modalCamara.value = { data: r.data, tickets: r.tickets || [] }
  } catch (e) { console.error(e) }
}

async function abrirTicket(id) {
  msgError.value = ''
  seguimiento.comentario = ''
  try {
    const r = await camarasService.getTicket(id)
    modalTicket.value = { data: r.data, bitacora: r.bitacora || [] }
    seguimiento.estatus = r.data.estatus
  } catch (e) { console.error(e) }
}

async function crearTicket() {
  guardando.value = true
  msgError.value = ''
  try {
    const fd = new FormData()
    fd.append('tipo_falla', nuevoTicket.tipo_falla)
    fd.append('descripcion', nuevoTicket.descripcion)
    const id = modalCamara.value.data.id
    await camarasService.crearTicket(id, fd)
    await Promise.all([abrirCamara(id), recargar()])
  } catch (e) {
    msgError.value = e.response?.data?.message || 'No se pudo crear el ticket'
  } finally { guardando.value = false }
}

async function guardarSeguimiento() {
  guardando.value = true
  msgError.value = ''
  try {
    const id = modalTicket.value.data.id
    await camarasService.comentarTicket(id, {
      estatus: seguimiento.estatus,
      comentario: seguimiento.comentario,
    })
    await Promise.all([abrirTicket(id), recargar()])
  } catch (e) {
    msgError.value = e.response?.data?.message || 'No se pudo guardar'
  } finally { guardando.value = false }
}

const gmaps = c => `https://www.google.com/maps?q=${c.latitud},${c.longitud}`
const etiquetaEstatus = s => ({ activa: 'Activa', con_falla: 'Con falla', inactiva: 'Inactiva' }[s] || s)
const etiquetaTicket  = s => ({ abierto: 'Abierto', en_proceso: 'En proceso', resuelto: 'Resuelto' }[s] || s)
const etiquetaFalla   = s => TIPOS_FALLA[s] || s
const fecha = f => f ? new Date(f.replace(' ', 'T')).toLocaleString('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—'
</script>

<style scoped>
.cam-view { display: flex; flex-direction: column; gap: 14px; }
.view-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: space-between; }
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub { font-size: 12px; color: var(--tx2); margin-top: 2px; }
.tabs-wrap { display: flex; gap: 4px; background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 10px; padding: 4px; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: none; background: transparent;
  border-radius: 7px; font-size: 13px; color: var(--tx2); cursor: pointer; font-family: inherit; }
.tab-btn:hover { background: var(--bg2); color: var(--tx0); }
.tab-btn.active { background: var(--acc-dim); color: var(--acc); font-weight: 500; }
.tab-count { background: var(--red); color: #fff; border-radius: 10px; font-size: 10px; padding: 1px 6px; }

.kpis { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px; }
.kpi { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; }
.kpi-n { font-size: 22px; font-weight: 600; color: var(--tx0); }
.kpi-l { font-size: 11px; color: var(--tx2); }
.kpi.ok .kpi-n { color: var(--grn); } .kpi.bad .kpi-n { color: var(--red); }
.kpi.warn .kpi-n { color: var(--amb); } .kpi.info .kpi-n { color: var(--acc); } .kpi.mute .kpi-n { color: var(--tx2); }

.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.toolbar { display: flex; gap: 10px; padding: 12px 14px; align-items: center; flex-wrap: wrap; border-bottom: 0.5px solid var(--bdr); }
.search-box { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px; background: var(--bg2);
  border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 0 10px; }
.search-box input { border: none; background: transparent; outline: none; color: var(--tx0); padding: 8px 0; flex: 1; font-size: 13px; font-family: inherit; }
.clear-btn { border: none; background: transparent; color: var(--tx2); cursor: pointer; }
.toolbar-right { display: flex; gap: 8px; margin-left: auto; }
.sel, .inp { background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 8px 10px;
  font-size: 13px; color: var(--tx0); outline: none; font-family: inherit; }
.inp { flex: 1; min-width: 160px; }

.map-wrap { position: relative; }
.map { height: 520px; width: 100%; background: var(--bg2); z-index: 0; }
.map-error { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--bg2); color: var(--red); font-size: 13px; }
.map-legend { position: absolute; bottom: 12px; left: 12px; z-index: 500; display: flex; gap: 12px; font-size: 11px;
  background: var(--bg1); border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 6px 10px; color: var(--tx1); }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 4px; }
.dot.ok { background: #22c97a; } .dot.bad { background: #f05454; } .dot.mute { background: #7b8294; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 10px 12px; font-size: 11px; color: var(--tx3); font-weight: 500; border-bottom: 0.5px solid var(--bdr); }
td { padding: 10px 12px; color: var(--tx1); border-bottom: 0.5px solid var(--bdr); }
tbody tr:hover { background: var(--bg2); }
.strong { color: var(--tx0); font-weight: 500; }
.mono { font-family: ui-monospace, monospace; } .small { font-size: 11px; }
.desc-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-row { text-align: center; color: var(--tx3); padding: 40px; }
.skeleton-wrap { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row { height: 36px; background: var(--bg2); border-radius: 8px; animation: pulse 1.5s ease-in-out infinite; }

.pill { display: inline-block; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; }
.pill.activa, .pill.t-resuelto { background: var(--grn-dim); color: var(--grn); }
.pill.con_falla, .pill.t-abierto { background: var(--red-dim); color: var(--red); }
.pill.inactiva { background: var(--bg3); color: var(--tx2); }
.pill.t-en_proceso { background: var(--amb-dim, rgba(245,158,11,.15)); color: var(--amb, #f59e0b); }
.tipo-pill { font-size: 11px; background: var(--bg2); border: 0.5px solid var(--bdr2); padding: 3px 9px; border-radius: 20px; color: var(--tx1); }

.btn-sm, .icon-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 8px; border: 0.5px solid var(--bdr2);
  background: transparent; font-size: 12px; color: var(--tx1); cursor: pointer; text-decoration: none; font-family: inherit; }
.btn-sm:hover, .icon-btn:hover { background: var(--bg3); color: var(--tx0); }
.icon-btn { padding: 5px 8px; margin: 0 2px; } .icon-btn.accent { color: var(--acc); }
.btn-primary-lg { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none;
  background: var(--acc); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 14px; width: 100%; max-width: 640px; max-height: 88vh;
  display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.modal-hdr { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px; border-bottom: 0.5px solid var(--bdr); }
.modal-hdr h2 { font-size: 15px; font-weight: 600; color: var(--tx0); display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.modal-hdr h2 i { color: var(--acc); } .modal-hdr p { font-size: 12px; color: var(--tx2); }
.btn-close { width: 30px; height: 30px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: var(--bg2); color: var(--tx1); cursor: pointer; }
.modal-body { padding: 16px 20px 20px; overflow-y: auto; }

.cam-top { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.cam-foto { width: 180px; height: 130px; object-fit: cover; border-radius: 10px; border: 0.5px solid var(--bdr2); }
.cam-foto.vacio { display: flex; align-items: center; justify-content: center; font-size: 32px; color: var(--tx3); background: var(--bg2); }
.cam-datos { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--tx0); }
.cam-datos label { display: block; font-size: 11px; color: var(--tx3); }
.blk-title { font-size: 12px; font-weight: 600; color: var(--tx0); display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.blk-title i { color: var(--acc); }
.muted-txt { font-size: 12px; color: var(--tx3); margin-bottom: 8px; }
.tk-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 0.5px solid var(--bdr); border-radius: 8px; margin-bottom: 6px; cursor: pointer; font-size: 12px; }
.tk-row:hover { background: var(--bg2); } .tk-desc { flex: 1; color: var(--tx1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-desc-full { font-size: 13px; color: var(--tx0); margin-bottom: 10px; }
.tk-foto { max-width: 100%; max-height: 260px; border-radius: 10px; margin-bottom: 8px; }
.bit-row { border-left: 2px solid var(--bdr2); padding: 4px 0 4px 12px; margin-bottom: 10px; font-size: 13px; color: var(--tx1); }
.bit-head { display: flex; gap: 10px; align-items: center; margin-bottom: 2px; flex-wrap: wrap; }
.form-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.form-col { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
.lbl { font-size: 12px; font-weight: 500; color: var(--tx1); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
.det { font-size: 10px; font-weight: 400; color: var(--tx3); display: inline-flex; align-items: center; gap: 4px; }
.det.ok { color: var(--grn); }
.map-pick { height: 280px; width: 100%; border-radius: 10px; border: 0.5px solid var(--bdr2); background: var(--bg2); }
select[size] { padding: 4px; }
.msg-err { color: var(--red); font-size: 12px; margin-top: 8px; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }
@media (max-width: 900px) { .kpis { grid-template-columns: repeat(3, 1fr); } .map { height: 380px; } }
</style>
