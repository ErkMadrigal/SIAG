<template>
  <div class="ma-view">

    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Mesa de ayuda</h1>
        <p class="view-sub">Tickets de soporte con georreferencia</p>
      </div>
      <div class="tabs-wrap">
        <button class="tab-btn" :class="{ active: tab === 'lista' }" @click="cambiarTab('lista')">
          <i class="ti ti-list"></i> Tickets
        </button>
        <button class="tab-btn" :class="{ active: tab === 'mapa' }" @click="cambiarTab('mapa')">
          <i class="ti ti-map-2"></i> Mapa
        </button>
      </div>
      <div style="display:flex;gap:8px">
        <button v-if="can('mesa_ayuda', 'crear')" class="btn-primary-lg" @click="abrirNuevo"><i class="ti ti-plus"></i> Nuevo ticket</button>
        <button class="btn-sm" @click="recargar" title="Recargar"><i class="ti ti-refresh"></i></button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpis">
      <div class="kpi bad"><span class="kpi-n">{{ resumen.tickets.abiertos || 0 }}</span><span class="kpi-l">Abiertos</span></div>
      <div class="kpi info"><span class="kpi-n">{{ resumen.tickets.en_proceso || 0 }}</span><span class="kpi-l">En proceso</span></div>
      <div class="kpi warn"><span class="kpi-n">{{ resumen.tickets.urgentes || 0 }}</span><span class="kpi-l">Urgentes activos</span></div>
      <div class="kpi ok"><span class="kpi-n">{{ resumen.tickets.resueltos || 0 }}</span><span class="kpi-l">Resueltos</span></div>
      <div class="kpi mute"><span class="kpi-n">{{ resumen.tickets.cerrados || 0 }}</span><span class="kpi-l">Cerrados</span></div>
      <div class="kpi"><span class="kpi-n">{{ resumen.tickets.total || 0 }}</span><span class="kpi-l">Total</span></div>
    </div>

    <!-- Filtros -->
    <div class="sec">
      <div class="toolbar">
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input v-model="filtros.q" placeholder="Buscar por folio, título, descripción o dirección..." @input="debounceCargar" />
          <button v-if="filtros.q" class="clear-btn" @click="filtros.q = ''; cargar()"><i class="ti ti-x"></i></button>
        </div>
        <div class="toolbar-right">
          <SearchSelect class="sel" v-model="filtros.estatus" @change="cargar">
            <option value="activos">Activos</option>
            <option value="">Todos</option>
            <option value="abierto">Abiertos</option>
            <option value="en_proceso">En proceso</option>
            <option value="resuelto">Resueltos</option>
            <option value="cerrado">Cerrados</option>
          </SearchSelect>
          <SearchSelect class="sel" v-model="filtros.prioridad" @change="cargar">
            <option value="">Toda prioridad</option>
            <option v-for="(l, k) in PRIORIDADES" :key="k" :value="k">{{ l }}</option>
          </SearchSelect>
          <SearchSelect class="sel" v-model="filtros.id_categoria" @change="cargar">
            <option value="">Toda categoría</option>
            <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </SearchSelect>
          <SearchSelect class="sel" v-model="filtros.id_asignado" @change="cargar">
            <option value="">Cualquier responsable</option>
            <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
          </SearchSelect>
        </div>
      </div>

      <!-- LISTA -->
      <div v-show="tab === 'lista'">
        <div v-if="loading" class="skeleton-wrap"><div class="skeleton-row" v-for="i in 6" :key="i"></div></div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:100px">Folio</th><th>Ticket</th><th>Categoría</th>
                <th style="text-align:center">Prioridad</th><th>Ubicación</th><th>Responsable</th>
                <th>Fecha</th><th style="text-align:center">Estatus</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tickets" :key="t.id" @click="abrirDetalle(t.id)" style="cursor:pointer">
                <td class="mono">{{ t.folio }}</td>
                <td class="strong ttl" :title="t.titulo">{{ t.titulo }}</td>
                <td><span class="tipo-pill">{{ t.categoria }}</span></td>
                <td style="text-align:center"><span class="pill" :class="'p-' + t.prioridad">{{ PRIORIDADES[t.prioridad] }}</span></td>
                <td class="desc-cell" :title="t.direccion">
                  <i v-if="t.latitud" class="ti ti-map-pin" style="color:var(--acc)"></i>
                  {{ t.estado || (t.latitud ? 'Con ubicación' : '—') }}
                </td>
                <td>{{ t.asignado_nombre || '—' }}</td>
                <td style="color:var(--tx2)">{{ fecha(t.created_at) }}</td>
                <td style="text-align:center"><span class="pill" :class="'e-' + t.estatus">{{ ESTATUS[t.estatus] }}</span></td>
              </tr>
              <tr v-if="!tickets.length">
                <td colspan="8" class="empty-row">
                  <i class="ti ti-headset" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>
                  No hay tickets con esos filtros
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MAPA -->
      <div v-show="tab === 'mapa'" class="map-wrap">
        <div ref="mapEl" class="map"></div>
        <div v-if="errorMapa" class="map-error"><i class="ti ti-wifi-off"></i> {{ errorMapa }}</div>
        <div class="map-legend">
          <span><i class="dot" style="background:#f05454"></i> Urgente</span>
          <span><i class="dot" style="background:#f5a623"></i> Alta</span>
          <span><i class="dot" style="background:#4f8ef7"></i> Media</span>
          <span><i class="dot" style="background:#7b8294"></i> Baja</span>
          <span class="muted-txt">{{ conUbicacion }} con ubicación</span>
        </div>
      </div>
    </div>

    <!-- MODAL nuevo ticket -->
    <Teleport to="body">
      <div v-if="modalNuevo" class="modal-overlay" @click.self="cerrarNuevo">
        <div class="modal">
          <div class="modal-hdr">
            <div>
              <h2><i class="ti ti-headset"></i> Nuevo ticket</h2>
              <p>La ubicación es opcional: haz clic en el mapa o usa tu ubicación.</p>
            </div>
            <button class="btn-close" @click="cerrarNuevo"><i class="ti ti-x"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-col" style="margin-top:0">
              <label class="lbl">Categoría *</label>
              <SearchSelect class="inp" v-model="form.id_categoria">
                <option value="">Seleccione</option>
                <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
              </SearchSelect>
              <label class="lbl">Título *</label>
              <input class="inp" v-model="form.titulo" maxlength="150" placeholder="Ej. Sin señal en cámara de caseta norte" />
              <label class="lbl">Descripción</label>
              <textarea class="inp" rows="3" v-model="form.descripcion" placeholder="Describe qué pasa, desde cuándo, qué se ha intentado..."></textarea>

              <label class="lbl">Prioridad</label>
              <div class="chips">
                <button v-for="(l, k) in PRIORIDADES" :key="k" type="button" class="chip" :class="['p-' + k, { on: form.prioridad === k }]"
                        @click="form.prioridad = k">{{ l }}</button>
              </div>

              <label class="lbl">Cámara relacionada (opcional)</label>
              <SearchSelect class="inp" v-model="form.id_camara">
                <option value="">Ninguna</option>
                <option v-for="c in camaras" :key="c.id" :value="c.id">{{ c.nombre }}{{ c.estado ? ' · ' + c.estado : '' }}</option>
              </SearchSelect>
            </div>

            <div class="blk-title" style="margin-top:16px"><i class="ti ti-map-pin"></i> Ubicación</div>
            <div ref="mapaPickEl" class="map-pick"></div>
            <div class="form-grid" style="margin-top:10px">
              <input class="inp" type="number" step="any" v-model="form.latitud" placeholder="Latitud" @change="desdeInputs" />
              <input class="inp" type="number" step="any" v-model="form.longitud" placeholder="Longitud" @change="desdeInputs" />
              <button class="btn-sm" @click="usarMiUbicacion" :disabled="buscandoGps">
                <i class="ti ti-loader-2 spin" v-if="buscandoGps"></i><i class="ti ti-current-location" v-else></i> Mi ubicación
              </button>
              <button v-if="form.latitud !== ''" class="btn-sm" @click="quitarPunto"><i class="ti ti-map-pin-off"></i> Quitar</button>
            </div>

            <div class="form-col">
              <label class="lbl">
                Estado
                <span v-if="detectando" class="det"><i class="ti ti-loader-2 spin"></i> detectando...</span>
                <span v-else-if="autoDetectado" class="det ok"><i class="ti ti-sparkles"></i> detectado por ubicación</span>
              </label>
              <SearchSelect class="inp" v-model="form.estado" @change="estadoManual = true">
                <option value="">Seleccione</option>
                <option v-for="e in ESTADOS_MX" :key="e" :value="e">{{ e }}</option>
              </SearchSelect>
              <label class="lbl">Dirección / referencia</label>
              <input class="inp" v-model="form.direccion" placeholder="Se detecta sola al marcar el punto; puedes corregirla"
                     @input="direccionManual = true" />
              <label class="lbl">Foto (opcional)</label>
              <FotoInput v-model="fotoNuevo" texto="Subir foto del problema" />
            </div>

            <p v-if="msgError" class="msg-err">{{ msgError }}</p>
            <div style="display:flex;justify-content:flex-end;margin-top:14px">
              <button class="btn-primary-lg" :disabled="guardando" @click="guardarNuevo">
                <i class="ti ti-loader-2 spin" v-if="guardando"></i><i class="ti ti-check" v-else></i> Levantar ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL detalle -->
    <Teleport to="body">
      <div v-if="detalle" class="modal-overlay" @click.self="detalle = null">
        <div class="modal">
          <div class="modal-hdr">
            <div>
              <h2><i class="ti ti-headset"></i> {{ detalle.data.folio }} · {{ detalle.data.titulo }}</h2>
              <p>
                {{ detalle.data.categoria }} ·
                <span class="pill" :class="'p-' + detalle.data.prioridad">{{ PRIORIDADES[detalle.data.prioridad] }}</span>
                <span class="pill" :class="'e-' + detalle.data.estatus" style="margin-left:6px">{{ ESTATUS[detalle.data.estatus] }}</span>
              </p>
            </div>
            <button class="btn-close" @click="detalle = null"><i class="ti ti-x"></i></button>
          </div>
          <div class="modal-body">
            <p class="desc-full">{{ detalle.data.descripcion || 'Sin descripción' }}</p>

            <div class="info-grid">
              <div><label>Levantó</label>{{ detalle.data.creado_por_nombre || '—' }}</div>
              <div><label>Fecha</label>{{ fecha(detalle.data.created_at) }}</div>
              <div><label>Responsable</label>{{ detalle.data.asignado_nombre || 'Sin asignar' }}</div>
              <div v-if="detalle.data.camara_nombre"><label>Cámara</label>{{ detalle.data.camara_nombre }}</div>
              <div v-if="detalle.data.estado"><label>Estado</label>{{ detalle.data.estado }}</div>
              <div v-if="detalle.data.direccion" class="full"><label>Dirección</label>{{ detalle.data.direccion }}</div>
              <div v-if="detalle.data.latitud" class="full">
                <label>Coordenadas</label>
                <span class="mono">{{ Number(detalle.data.latitud).toFixed(6) }}, {{ Number(detalle.data.longitud).toFixed(6) }}</span>
                <a class="btn-sm" style="margin-left:10px" :href="gmaps(detalle.data)" target="_blank" rel="noopener">
                  <i class="ti ti-map-pin"></i> Google Maps</a>
              </div>
            </div>
            <img v-if="detalle.data.foto_url" :src="detalle.data.foto_url" class="foto-det" />

            <div class="blk-title" style="margin-top:16px"><i class="ti ti-history"></i> Bitácora</div>
            <div v-if="!detalle.bitacora.length" class="muted-txt">Sin movimientos todavía</div>
            <div v-for="b in detalle.bitacora" :key="b.id" class="bit-row">
              <div class="bit-head">
                <strong>{{ b.autor || 'Sistema' }}</strong>
                <span class="muted-txt">{{ fecha(b.created_at) }}</span>
              </div>
              <div v-if="b.cambio" class="bit-cambio"><i class="ti ti-arrows-exchange"></i> {{ b.cambio }}</div>
              <div v-if="b.comentario">{{ b.comentario }}</div>
            </div>

            <div class="blk-title" style="margin-top:18px"><i class="ti ti-message"></i> Dar seguimiento</div>
            <div class="seg-grid">
              <div><label class="lbl">Estatus</label>
                <SearchSelect class="inp" v-model="seg.estatus">
                  <option v-for="(l, k) in ESTATUS" :key="k" :value="k">{{ l }}</option>
                </SearchSelect></div>
              <div><label class="lbl">Prioridad</label>
                <SearchSelect class="inp" v-model="seg.prioridad">
                  <option v-for="(l, k) in PRIORIDADES" :key="k" :value="k">{{ l }}</option>
                </SearchSelect></div>
              <div><label class="lbl">Responsable</label>
                <SearchSelect class="inp" v-model="seg.id_asignado">
                  <option value="">Sin asignar</option>
                  <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
                </SearchSelect></div>
            </div>
            <textarea class="inp" rows="2" v-model="seg.comentario" style="margin-top:8px;width:100%"
                      placeholder="Comentario (qué se hizo, qué falta...)"></textarea>
            <p v-if="msgError" class="msg-err">{{ msgError }}</p>
            <div style="display:flex;justify-content:flex-end;margin-top:12px">
              <button v-if="can('mesa_ayuda', 'actualizar')" class="btn-primary-lg" :disabled="guardando" @click="guardarSeguimiento">
                <i class="ti ti-loader-2 spin" v-if="guardando"></i><i class="ti ti-check" v-else></i> Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import SearchSelect from '@/components/ui/SearchSelect.vue'
import { usePermisos } from '@/composables/usePermisos.js'
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { mesaAyudaService } from '@/services/mesaAyuda.service.js'
import { camarasService } from '@/services/camaras.service.js'
import { cargarLeaflet } from '@/composables/useLeaflet.js'
import FotoInput from '@/components/ui/FotoInput.vue'
const { can } = usePermisos()

const PRIORIDADES = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' }
const ESTATUS = { abierto: 'Abierto', en_proceso: 'En proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }
const COLOR_PRIO = { urgente: '#f05454', alta: '#f5a623', media: '#4f8ef7', baja: '#7b8294' }
const ESTADOS_MX = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
  'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas',
]

const tab       = ref('lista')
const loading   = ref(true)
const guardando = ref(false)
const msgError  = ref('')
const tickets   = ref([])
const categorias = ref([])
const usuarios   = ref([])
const camaras    = ref([])
const resumen   = reactive({ tickets: {}, categorias: [] })
const filtros   = reactive({ q: '', estatus: 'activos', prioridad: '', id_categoria: '', id_asignado: '' })

const conUbicacion = computed(() => tickets.value.filter(t => t.latitud).length)

// ── Mapa principal ──
const mapEl = ref(null)
const errorMapa = ref('')
let map = null, capa = null, L = null, timer = null

// ── Nuevo ticket ──
const modalNuevo = ref(false)
const form = reactive({
  id_categoria: '', titulo: '', descripcion: '', prioridad: 'media', id_camara: '',
  latitud: '', longitud: '', estado: '', direccion: '',
})
const fotoNuevo = ref(null)
const mapaPickEl = ref(null)
const buscandoGps = ref(false)
const detectando = ref(false)
const autoDetectado = ref(false)
let estadoManual = false, direccionManual = false
let pickMap = null, pickMarker = null, geoTimer = null, precisionGps = null

// ── Detalle ──
const detalle = ref(null)
const seg = reactive({ estatus: 'abierto', prioridad: 'media', id_asignado: '', comentario: '' })

onMounted(async () => {
  await Promise.all([cargar(), cargarResumen(), cargarCatalogos()])
  iniciarMapa()
})

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null }
  if (pickMap) { pickMap.remove(); pickMap = null }
})

async function cargarCatalogos() {
  try {
    const [c, u, cam] = await Promise.all([
      mesaAyudaService.categorias(), mesaAyudaService.usuarios(), camarasService.getAll()
    ])
    categorias.value = c; usuarios.value = u; camaras.value = cam
  } catch (e) { console.error(e) }
}

async function cargarResumen() {
  try {
    const r = await mesaAyudaService.resumen()
    resumen.tickets = r.tickets || {}
    resumen.categorias = r.categorias || []
  } catch (e) { console.error(e) }
}

async function cargar() {
  loading.value = true
  try {
    tickets.value = await mesaAyudaService.getAll({ ...filtros })
    pintarMarcadores(true)
  } catch (e) { console.error(e) } finally { loading.value = false }
}

function debounceCargar() { clearTimeout(timer); timer = setTimeout(cargar, 350) }
async function recargar() { await Promise.all([cargar(), cargarResumen()]) }

async function cambiarTab(t) {
  tab.value = t
  if (t === 'mapa') { await nextTick(); map?.invalidateSize(); pintarMarcadores(true) }
}

// ───────── Mapa principal ─────────
async function iniciarMapa() {
  try {
    L = await cargarLeaflet()
    await nextTick()
    map = L.map(mapEl.value).setView([23.6345, -102.5528], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
    capa = L.layerGroup().addTo(map)
    pintarMarcadores(true)
  } catch (e) { errorMapa.value = e.message }
}

function pintarMarcadores(ajustar = false) {
  if (!map || !capa) return
  capa.clearLayers()
  const pts = []
  tickets.value.filter(t => t.latitud).forEach(t => {
    const ll = [Number(t.latitud), Number(t.longitud)]
    pts.push(ll)
    const cerrado = ['resuelto', 'cerrado'].includes(t.estatus)
    L.circleMarker(ll, {
      radius: 9, color: '#fff', weight: 2,
      fillColor: COLOR_PRIO[t.prioridad] || '#4f8ef7', fillOpacity: cerrado ? 0.35 : 0.95
    })
      .bindTooltip(`${t.folio} · ${t.titulo}`)
      .on('click', () => abrirDetalle(t.id))
      .addTo(capa)
  })
  if (ajustar && pts.length && tab.value === 'mapa') map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 })
}

// ───────── Nuevo ticket ─────────
async function abrirNuevo() {
  Object.assign(form, {
    id_categoria: '', titulo: '', descripcion: '', prioridad: 'media', id_camara: '',
    latitud: '', longitud: '', estado: '', direccion: '',
  })
  fotoNuevo.value = null
  precisionGps = null
  estadoManual = direccionManual = false
  autoDetectado.value = false
  msgError.value = ''
  modalNuevo.value = true
  await nextTick()
  try {
    L = L || await cargarLeaflet()
    pickMap = L.map(mapaPickEl.value).setView([23.6345, -102.5528], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(pickMap)
    pickMap.on('click', e => { precisionGps = null; setPunto(e.latlng.lat, e.latlng.lng) })
  } catch (e) { msgError.value = e.message }
}

function setPunto(lat, lng, zoom) {
  form.latitud = Number(lat).toFixed(7)
  form.longitud = Number(lng).toFixed(7)
  if (!pickMap) return
  if (pickMarker) pickMarker.setLatLng([lat, lng])
  else pickMarker = L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 2, fillColor: '#4f8ef7', fillOpacity: 0.95 }).addTo(pickMap)
  if (zoom) pickMap.setView([lat, lng], zoom)
  clearTimeout(geoTimer)
  geoTimer = setTimeout(() => autocompletar(lat, lng), 700)
}

async function autocompletar(lat, lng) {
  if (estadoManual && direccionManual) return
  detectando.value = true
  try {
    const g = await camarasService.geocodificar(lat, lng)
    if (!estadoManual && g.estado) form.estado = g.estado
    if (!direccionManual && g.direccion) form.direccion = g.direccion
    autoDetectado.value = !!(g.estado || g.direccion)
  } catch (e) { console.error('No se pudo detectar la dirección', e) } finally { detectando.value = false }
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
    pos => { precisionGps = pos.coords.accuracy; setPunto(pos.coords.latitude, pos.coords.longitude, 17); buscandoGps.value = false },
    err => { msgError.value = 'No se pudo obtener tu ubicación: ' + err.message; buscandoGps.value = false },
    { enableHighAccuracy: true, timeout: 20000 }
  )
}

function quitarPunto() {
  form.latitud = ''; form.longitud = ''
  if (pickMarker && pickMap) { pickMap.removeLayer(pickMarker); pickMarker = null }
  autoDetectado.value = false
}

function cerrarNuevo() {
  if (pickMap) { pickMap.remove(); pickMap = null; pickMarker = null }
  modalNuevo.value = false
}

async function guardarNuevo() {
  msgError.value = ''
  if (!form.id_categoria) { msgError.value = 'Elige una categoría'; return }
  if (!form.titulo.trim()) { msgError.value = 'Escribe un título'; return }

  guardando.value = true
  try {
    const fd = new FormData()
    fd.append('id_categoria', form.id_categoria)
    fd.append('titulo', form.titulo.trim())
    fd.append('descripcion', form.descripcion.trim())
    fd.append('prioridad', form.prioridad)
    if (form.id_camara) fd.append('id_camara', form.id_camara)
    if (form.latitud !== '' && form.longitud !== '') {
      fd.append('latitud', form.latitud)
      fd.append('longitud', form.longitud)
      if (precisionGps != null) fd.append('precision_m', precisionGps)
    }
    if (form.estado) fd.append('estado', form.estado)
    if (form.direccion) fd.append('direccion', form.direccion.trim())
    if (fotoNuevo.value) fd.append('foto', fotoNuevo.value)
    await mesaAyudaService.create(fd)
    cerrarNuevo()
    await recargar()
  } catch (e) {
    msgError.value = e.response?.data?.message || 'No se pudo crear el ticket'
  } finally { guardando.value = false }
}

// ───────── Detalle / seguimiento ─────────
async function abrirDetalle(id) {
  msgError.value = ''
  try {
    const r = await mesaAyudaService.getById(id)
    detalle.value = { data: r.data, bitacora: r.bitacora || [] }
    seg.estatus = r.data.estatus
    seg.prioridad = r.data.prioridad
    seg.id_asignado = r.data.id_asignado ? Number(r.data.id_asignado) : ''
    seg.comentario = ''
  } catch (e) { console.error(e) }
}

async function guardarSeguimiento() {
  guardando.value = true
  msgError.value = ''
  try {
    const id = detalle.value.data.id
    await mesaAyudaService.seguimiento(id, {
      estatus: seg.estatus,
      prioridad: seg.prioridad,
      id_asignado: seg.id_asignado || null,
      comentario: seg.comentario,
    })
    await Promise.all([abrirDetalle(id), recargar()])
  } catch (e) {
    msgError.value = e.response?.data?.message || 'No se pudo guardar'
  } finally { guardando.value = false }
}

const gmaps = t => `https://www.google.com/maps?q=${t.latitud},${t.longitud}`
const fecha = f => f ? new Date(f.replace(' ', 'T')).toLocaleString('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—'
</script>

<style scoped>
.ma-view { display: flex; flex-direction: column; gap: 14px; }
.view-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: space-between; }
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub { font-size: 12px; color: var(--tx2); margin-top: 2px; }
.tabs-wrap { display: flex; gap: 4px; background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 10px; padding: 4px; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: none; background: transparent;
  border-radius: 7px; font-size: 13px; color: var(--tx2); cursor: pointer; font-family: inherit; }
.tab-btn:hover { background: var(--bg2); color: var(--tx0); }
.tab-btn.active { background: var(--acc-dim); color: var(--acc); font-weight: 500; }

.kpis { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px; }
.kpi { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; }
.kpi-n { font-size: 22px; font-weight: 600; color: var(--tx0); } .kpi-l { font-size: 11px; color: var(--tx2); }
.kpi.ok .kpi-n { color: var(--grn); } .kpi.bad .kpi-n { color: var(--red); }
.kpi.warn .kpi-n { color: var(--amb); } .kpi.info .kpi-n { color: var(--acc); } .kpi.mute .kpi-n { color: var(--tx2); }

.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.toolbar { display: flex; gap: 10px; padding: 12px 14px; align-items: center; flex-wrap: wrap; border-bottom: 0.5px solid var(--bdr); }
.search-box { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px; background: var(--bg2);
  border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 0 10px; }
.search-box input { border: none; background: transparent; outline: none; color: var(--tx0); padding: 8px 0; flex: 1; font-size: 13px; font-family: inherit; }
.clear-btn { border: none; background: transparent; color: var(--tx2); cursor: pointer; }
.toolbar-right { display: flex; gap: 8px; flex-wrap: wrap; }
.sel, .inp { background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 8px 10px;
  font-size: 13px; color: var(--tx0); outline: none; font-family: inherit; }
.inp { flex: 1; min-width: 160px; }

.map-wrap { position: relative; }
.map { height: 540px; width: 100%; background: var(--bg2); z-index: 0; }
.map-error { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--bg2); color: var(--red); font-size: 13px; }
.map-legend { position: absolute; bottom: 12px; left: 12px; z-index: 500; display: flex; gap: 12px; font-size: 11px; align-items: center;
  background: var(--bg1); border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 6px 10px; color: var(--tx1); }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 4px; }
.map-pick { height: 260px; width: 100%; border-radius: 10px; border: 0.5px solid var(--bdr2); background: var(--bg2); }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 10px 12px; font-size: 11px; color: var(--tx3); font-weight: 500; border-bottom: 0.5px solid var(--bdr); }
td { padding: 10px 12px; color: var(--tx1); border-bottom: 0.5px solid var(--bdr); }
tbody tr:hover { background: var(--bg2); }
.strong { color: var(--tx0); font-weight: 500; } .mono { font-family: ui-monospace, monospace; }
.ttl { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.desc-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-row { text-align: center; color: var(--tx3); padding: 40px; }
.skeleton-wrap { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row { height: 36px; background: var(--bg2); border-radius: 8px; animation: pulse 1.5s ease-in-out infinite; }

.pill { display: inline-block; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; }
.pill.p-urgente { background: var(--red-dim); color: var(--red); }
.pill.p-alta { background: rgba(245,166,35,.15); color: #f5a623; }
.pill.p-media { background: var(--acc-dim); color: var(--acc); }
.pill.p-baja { background: var(--bg3); color: var(--tx2); }
.pill.e-abierto { background: var(--red-dim); color: var(--red); }
.pill.e-en_proceso { background: rgba(245,166,35,.15); color: #f5a623; }
.pill.e-resuelto { background: var(--grn-dim); color: var(--grn); }
.pill.e-cerrado { background: var(--bg3); color: var(--tx2); }
.tipo-pill { font-size: 11px; background: var(--bg2); border: 0.5px solid var(--bdr2); padding: 3px 9px; border-radius: 20px; color: var(--tx1); }

.btn-sm { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 8px; border: 0.5px solid var(--bdr2);
  background: transparent; font-size: 12px; color: var(--tx1); cursor: pointer; text-decoration: none; font-family: inherit; }
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }
.btn-primary-lg { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none;
  background: var(--acc); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 14px; width: 100%; max-width: 680px; max-height: 90vh;
  display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.modal-hdr { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px; border-bottom: 0.5px solid var(--bdr); }
.modal-hdr h2 { font-size: 15px; font-weight: 600; color: var(--tx0); display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.modal-hdr h2 i { color: var(--acc); } .modal-hdr p { font-size: 12px; color: var(--tx2); }
.btn-close { width: 30px; height: 30px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: var(--bg2); color: var(--tx1); cursor: pointer; flex-shrink: 0; }
.modal-body { padding: 16px 20px 20px; overflow-y: auto; }

.form-col { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
.form-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.lbl { font-size: 12px; font-weight: 500; color: var(--tx1); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
.det { font-size: 10px; font-weight: 400; color: var(--tx3); display: inline-flex; align-items: center; gap: 4px; }
.det.ok { color: var(--grn); }
.blk-title { font-size: 12px; font-weight: 600; color: var(--tx0); display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.blk-title i { color: var(--acc); }
.muted-txt { font-size: 12px; color: var(--tx3); }
.msg-err { color: var(--red); font-size: 12px; margin-top: 8px; }

.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { padding: 7px 14px; border-radius: 20px; cursor: pointer; font-size: 12px; font-family: inherit;
  background: var(--bg2); border: 0.5px solid var(--bdr2); color: var(--tx1); }
.chip.on.p-baja { background: var(--bg3); border-color: var(--tx2); color: var(--tx0); }
.chip.on.p-media { background: var(--acc-dim); border-color: var(--acc); color: var(--acc); }
.chip.on.p-alta { background: rgba(245,166,35,.15); border-color: #f5a623; color: #f5a623; }
.chip.on.p-urgente { background: var(--red-dim); border-color: var(--red); color: var(--red); }

.desc-full { font-size: 13px; color: var(--tx0); margin-bottom: 12px; white-space: pre-wrap; }
.info-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px 16px; font-size: 13px; color: var(--tx0); }
.info-grid label { display: block; font-size: 11px; color: var(--tx3); }
.info-grid .full { grid-column: 1 / -1; }
.foto-det { max-width: 100%; max-height: 280px; border-radius: 10px; margin-top: 12px; }
.bit-row { border-left: 2px solid var(--bdr2); padding: 4px 0 4px 12px; margin-bottom: 10px; font-size: 13px; color: var(--tx1); }
.bit-head { display: flex; gap: 10px; align-items: center; margin-bottom: 2px; flex-wrap: wrap; }
.bit-cambio { font-size: 12px; color: var(--acc); margin-bottom: 2px; }
.seg-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
.seg-grid .inp { width: 100%; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }
@media (max-width: 900px) { .kpis { grid-template-columns: repeat(3, 1fr); } .map { height: 380px; } .seg-grid { grid-template-columns: 1fr; } }
</style>
