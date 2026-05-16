<template>
  <div class="params-view">

    <div class="view-header">
      <div>
        <h1 class="view-title">Parámetros del sistema</h1>
        <p class="view-sub">Administra ubicaciones, empresas, zonas y más</p>
      </div>
    </div>

    <!-- Grid de secciones -->
    <div class="params-grid">

      <!-- SERVICIOS (full width) -->
      <div class="sec full-width">
        <CatalogoSeccion
          titulo="Servicios"
          :columnas="['ID','Servicio','Ubicación','CP','Zona','Estatus', 'Mapa']"
          :datos="filtrar('servicios')"
          :loading="loading.servicios"
          :schema="schemas.servicios"
          :deps="deps"
          @nuevo="abrirModal('servicios','insert')"
          @editar="(r) => abrirModal('servicios','update',r)"
          @eliminar="(r) => eliminar('servicios',r)"
          @ver="(r) => abrirDetalle('servicios',r)"
          @reload="cargar('servicios')"
          @search="(q) => busquedas.servicios = q"
          @filter-status="(s) => estatus.servicios = s"
        >
          <template #row="{ row }">
            <td class="mono">{{ row.id }}</td>
            <td style="font-weight:500">{{ row.servicio }}</td>
            <td style="color:var(--tx2)">{{ row.ubicacion || '—' }}</td>
            <td class="mono">{{ row.cp || '—' }}</td>
            <td style="color:var(--tx1)">{{ row.zona || '—' }}</td>
            <td><StatusPillNum :status="row.estatus ?? row.status" /></td>
            <td @click.stop style="text-align:right">
                <div class="row-actions" style="justify-content:flex-end">
                <button v-if="row.latitud && row.longitud"
                    class="icon-btn" style="color:#4f8ef7"
                    @click="abrirMapa(row)" title="Ver en mapa">
                    <i class="ti ti-map-pin"></i>
                </button>
                </div>
            </td>
          </template>
        </CatalogoSeccion>
      </div>

      <!-- CLIENTES -->
      <div class="sec">
        <CatalogoSeccion
          titulo="Clientes"
          :columnas="['ID','Nombre corto','Empresa','Partida','Estatus']"
          :datos="filtrar('clientes')"
          :loading="loading.clientes"
          :schema="schemas.clientes"
          :deps="deps"
          @nuevo="abrirModal('clientes','insert')"
          @editar="(r) => abrirModal('clientes','update',r)"
          @eliminar="(r) => eliminar('clientes',r)"
          @ver="(r) => abrirDetalle('clientes',r)"
          @reload="cargar('clientes')"
          @search="(q) => busquedas.clientes = q"
          @filter-status="(s) => estatus.clientes = s"
        >
          <template #row="{ row }">
            <td class="mono">{{ row.id }}</td>
            <td style="font-weight:500">{{ row.nombre_corto }}</td>
            <td style="color:var(--tx2)">{{ row.empresa || '—' }}</td>
            <td style="color:var(--tx2)">{{ row.partida || '—' }}</td>
            <td><StatusPillNum :status="row.estatus ?? row.status" /></td>
          </template>
        </CatalogoSeccion>
      </div>

      <!-- EMPRESAS -->
      <div class="sec">
        <CatalogoSeccion
          titulo="Empresas"
          :columnas="['ID','Empresa','Estatus']"
          :datos="filtrar('empresas')"
          :loading="loading.empresas"
          :schema="schemas.empresas"
          :deps="deps"
          @nuevo="abrirModal('empresas','insert')"
          @editar="(r) => abrirModal('empresas','update',r)"
          @eliminar="(r) => eliminar('empresas',r)"
          @ver="(r) => abrirDetalle('empresas',r)"
          @reload="cargar('empresas')"
          @search="(q) => busquedas.empresas = q"
          @filter-status="(s) => estatus.empresas = s"
        >
          <template #row="{ row }">
            <td class="mono">{{ row.id }}</td>
            <td style="font-weight:500">{{ row.empresa }}</td>
            <td><StatusPillNum :status="row.estatus ?? row.status" /></td>
          </template>
        </CatalogoSeccion>
      </div>

      <!-- PARTIDAS -->
      <div class="sec">
        <CatalogoSeccion
          titulo="Partidas"
          :columnas="['ID','Partida','Estatus']"
          :datos="filtrar('partidas')"
          :loading="loading.partidas"
          :schema="schemas.partidas"
          :deps="deps"
          @nuevo="abrirModal('partidas','insert')"
          @editar="(r) => abrirModal('partidas','update',r)"
          @eliminar="(r) => eliminar('partidas',r)"
          @ver="(r) => abrirDetalle('partidas',r)"
          @reload="cargar('partidas')"
          @search="(q) => busquedas.partidas = q"
          @filter-status="(s) => estatus.partidas = s"
        >
          <template #row="{ row }">
            <td class="mono">{{ row.id }}</td>
            <td style="font-weight:500">{{ row.partida }}</td>
            <td><StatusPillNum :status="row.estatus ?? row.status" /></td>
          </template>
        </CatalogoSeccion>
      </div>

      <!-- ZONAS -->
      <div class="sec">
        <CatalogoSeccion
          titulo="Zonas"
          :columnas="['ID','Zona','Estatus']"
          :datos="filtrar('zonas')"
          :loading="loading.zonas"
          :schema="schemas.zonas"
          :deps="deps"
          @nuevo="abrirModal('zonas','insert')"
          @editar="(r) => abrirModal('zonas','update',r)"
          @eliminar="(r) => eliminar('zonas',r)"
          @ver="(r) => abrirDetalle('zonas',r)"
          @reload="cargar('zonas')"
          @search="(q) => busquedas.zonas = q"
          @filter-status="(s) => estatus.zonas = s"
        >
          <template #row="{ row }">
            <td class="mono">{{ row.id }}</td>
            <td style="font-weight:500">{{ row.zona }}</td>
            <td><StatusPillNum :status="row.estatus ?? row.status" /></td>
          </template>
        </CatalogoSeccion>
      </div>

      <!-- ESTADOS/REGIONES -->
      <div class="sec">
        <CatalogoSeccion
          titulo="Estados"
          :columnas="['ID','Estado','Región','Estatus']"
          :datos="filtrar('regiones')"
          :loading="loading.regiones"
          :schema="schemas.regiones"
          :deps="deps"
          @nuevo="abrirModal('regiones','insert')"
          @editar="(r) => abrirModal('regiones','update',r)"
          @eliminar="(r) => eliminar('regiones',r)"
          @ver="(r) => abrirDetalle('regiones',r)"
          @reload="cargar('regiones')"
          @search="(q) => busquedas.regiones = q"
          @filter-status="(s) => estatus.regiones = s"
        >
          <template #row="{ row }">
            <td class="mono">{{ row.id }}</td>
            <td style="font-weight:500">{{ row.estado }}</td>
            <td style="color:var(--tx2)">{{ row.region || '—' }}</td>
            <td><StatusPillNum :status="row.estatus ?? row.status" /></td>
          </template>
        </CatalogoSeccion>
      </div>

      <!-- REGIONALES -->
      <div class="sec">
        <CatalogoSeccion
          titulo="Regionales"
          :columnas="['ID','Región','Regional']"
          :datos="filtrar('areas_geograficas')"
          :loading="loading.areas_geograficas"
          :schema="schemas.areas_geograficas"
          :deps="deps"
          :sin-nuevo="true"
          @reload="cargar('areas_geograficas')"
          @search="(q) => busquedas.areas_geograficas = q"
        >
          <template #row="{ row }">
            <td class="mono">{{ row.id }}</td>
            <td style="font-weight:500">{{ row.region }}</td>
            <td style="color:var(--tx2)">{{ row.nombre || '—' }}</td>
          </template>
        </CatalogoSeccion>
      </div>

    </div>

    <!-- MODAL FORM -->
    <Teleport to="body">
      <div v-if="modalForm.open" class="modal-overlay" @click.self="modalForm.open = false">
        <div class="modal-box lg">
          <div class="modal-hdr">
            <div class="modal-icon"><i class="ti ti-edit" aria-hidden="true"></i></div>
            <div>
              <p class="modal-title">{{ modalForm.modo === 'insert' ? 'Nuevo' : 'Editar' }} — {{ modalForm.entidad }}</p>
              <p class="modal-sub" v-if="modalForm.modo === 'update'">ID: {{ modalForm.data.id }}</p>
            </div>
            <button class="modal-close" @click="modalForm.open = false"><i class="ti ti-x"></i></button>
          </div>

          <div class="modal-body-scroll">
            <div v-if="modalForm.alert" class="modal-alert" :class="modalForm.alertType">
              <i class="ti ti-alert-circle" aria-hidden="true"></i>
              {{ modalForm.alert }}
            </div>
            <div class="field-grid-2">
              <template v-for="f in currentSchema?.fields" :key="f.name">
                <div class="field" :class="{ 'field-full': f.fullWidth }">
                  <label>{{ f.label }} <span v-if="f.required" class="req">*</span></label>

                  <select v-if="f.type === 'select' && f.optionsFrom"
                    v-model="modalForm.data[f.name]"
                    :disabled="loadingDeps"
                  >
                    <option value="">Seleccione {{ f.label }}</option>
                    <option v-for="o in getDepOptions(f.optionsFrom)" :key="o.id" :value="o.id">
                      {{ o[f.optionsFrom[1]] || o.nombre || o.label }}
                    </option>
                  </select>

                  <select v-else-if="f.type === 'select'"
                    v-model="modalForm.data[f.name]"
                  >
                    <option v-for="[v,l] in f.options" :key="v" :value="v">{{ l }}</option>
                  </select>

                  <input v-else
                    :type="f.type || 'text'"
                    v-model="modalForm.data[f.name]"
                    :placeholder="f.label"
                    @input="f.upper && (modalForm.data[f.name] = modalForm.data[f.name].toUpperCase())"
                  />
                </div>
              </template>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-sm" @click="modalForm.open = false" :disabled="modalForm.saving">Cancelar</button>
            <button class="btn-primary-lg" :disabled="modalForm.saving" @click="guardarModal">
              <i class="ti ti-loader-2 spin" v-if="modalForm.saving" aria-hidden="true"></i>
              <i class="ti ti-check" v-else aria-hidden="true"></i>
              {{ modalForm.saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL DETALLE -->
    <Teleport to="body">
      <div v-if="modalDetalle.open" class="modal-overlay" @click.self="modalDetalle.open = false">
        <div class="modal-box">
          <div class="modal-hdr">
            <div class="modal-icon blue"><i class="ti ti-zoom-in" aria-hidden="true"></i></div>
            <div>
              <p class="modal-title">Detalle — {{ modalDetalle.entidad }}</p>
              <p class="modal-sub">ID: {{ modalDetalle.data?.id }}</p>
            </div>
            <button class="modal-close" @click="modalDetalle.open = false"><i class="ti ti-x"></i></button>
          </div>
          <div class="modal-body-scroll">
            <div class="detail-grid">
              <div v-for="(val, key) in modalDetalle.data" :key="key" class="detail-item">
                <span class="detail-label">{{ key }}</span>
                <span class="detail-val mono">{{ val ?? '—' }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-sm" @click="modalDetalle.open = false">Cerrar</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>

    <!-- MODAL MAPA -->
    <Teleport to="body">
    <div v-if="modalMapa.open" class="modal-overlay" @click.self="modalMapa.open = false">
        <div class="modal-box lg">
        <div class="modal-hdr">
            <div class="modal-icon" style="background:#1a2d4d;color:#4f8ef7">
            <i class="ti ti-map-pin" aria-hidden="true"></i>
            </div>
            <div>
            <p class="modal-title">{{ modalMapa.servicio?.servicio }}</p>
            <p class="modal-sub">
                {{ modalMapa.servicio?.ubicacion || '' }}
                {{ modalMapa.servicio?.cp ? '· CP ' + modalMapa.servicio.cp : '' }}
            </p>
            </div>
            <button class="modal-close" @click="modalMapa.open = false">
            <i class="ti ti-x"></i>
            </button>
        </div>

        <div style="flex:1;overflow:hidden;min-height:380px">
            <iframe
            :src="`https://www.google.com/maps?output=embed&q=${modalMapa.servicio?.latitud},${modalMapa.servicio?.longitud}&z=16`"
            style="width:100%;height:100%;min-height:380px;border:none;display:block"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
        </div>

        <div class="modal-footer" style="justify-content:space-between;align-items:center">
            <div style="font-size:12px;color:var(--tx2);font-family:monospace">
            {{ modalMapa.servicio?.latitud }}, {{ modalMapa.servicio?.longitud }}
            </div>
            <div style="display:flex;gap:8px">
            <button class="btn-sm" @click="modalMapa.open = false">Cerrar</button>
            <button class="btn-primary-lg" @click="abrirGoogleMaps">
                <i class="ti ti-external-link" aria-hidden="true"></i>
                Abrir en Google Maps
            </button>
            </div>
        </div>
        </div>
    </div>
    </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted, defineComponent, h } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import api from '@/services/api.js'

const ui = useUiStore()


// ── StatusPill inline ────────────────────────────────
const StatusPillNum = defineComponent({
  props: { status: [Number, String] },
  setup(props) {
    return () => {
      const ok = String(props.status) === '1'
      const color     = ok ? '#22c97a' : '#f05454'
      const bgColor   = ok ? '#0d2e1f' : '#2e1010'
      return h('span', {
        style: `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 9px;border-radius:20px;font-weight:500;background:${bgColor};color:${color}`
      }, [
        h('span', { style: `width:5px;height:5px;border-radius:50%;background:${color};display:inline-block` }),
        ok ? 'Activo' : 'Inactivo'
      ])
    }
  }
})


// ── CatalogoSeccion inline ───────────────────────────
const CatalogoSeccion = defineComponent({
  props: {
    titulo:    String,
    columnas:  Array,
    datos:     Array,
    loading:   Boolean,
    sinNuevo:  Boolean,
  },
  emits: ['nuevo','editar','eliminar','ver','reload','search','filter-status'],
  setup(props, { slots, emit }) {
    const q   = ref('')
    const est = ref('')
    const onSearch = (e) => { q.value = e.target.value; emit('search', e.target.value) }
    const onStatus = (e) => { est.value = e.target.value; emit('filter-status', e.target.value) }

    return () => h('div', { class: 'cat-sec' }, [
      // Header
      h('div', { class: 'cat-sec-hdr' }, [
        h('span', { class: 'cat-sec-title' }, props.titulo),
        h('div', { class: 'cat-sec-actions' }, [
          h('div', { class: 'search-box-sm' }, [
            h('i', { class: 'ti ti-search', 'aria-hidden': 'true' }),
            h('input', { placeholder: 'Buscar...', onInput: onSearch }),
          ]),
          h('select', { class: 'sel-sm', onChange: onStatus }, [
            h('option', { value: '' }, 'Todos'),
            h('option', { value: '1' }, 'Activos'),
            h('option', { value: '0' }, 'Inactivos'),
          ]),
          h('button', { class: 'icon-btn', onClick: () => emit('reload'), title: 'Recargar' },
            h('i', { class: 'ti ti-refresh' })
          ),
          !props.sinNuevo && h('button', { class: 'btn-nuevo', onClick: () => emit('nuevo') }, [
            h('i', { class: 'ti ti-plus', 'aria-hidden': 'true' }),
            ' Nuevo'
          ]),
        ])
      ]),

      // Skeleton
      props.loading && h('div', { class: 'skeleton-wrap', style: 'padding:10px' }, [1,2,3,4].map(i =>
        h('div', { key: i, class: 'skeleton-row', style: 'height:38px;margin-bottom:6px' })
      )),

      // Tabla
      !props.loading && h('div', { class: 'table-wrap' }, [
        h('table', {}, [
          h('thead', {}, h('tr', {}, [
            ...props.columnas.map(c => h('th', {}, c)),
            !props.sinNuevo && h('th', { style: 'text-align:right;width:90px' }, 'Acciones')
          ].filter(Boolean))),
          h('tbody', {}, props.datos?.length
            ? props.datos.map(row => h('tr', { key: row.id }, [
                slots.row?.({ row }),
                !props.sinNuevo && h('td', { onClick: (e) => e.stopPropagation() }, [
                  h('div', { class: 'row-actions' }, [
                    h('button', { class: 'icon-btn', onClick: () => emit('ver', row), title: 'Ver' },
                      h('i', { class: 'ti ti-zoom-in' })
                    ),
                    h('button', { class: 'icon-btn accent', onClick: () => emit('editar', row), title: 'Editar' },
                      h('i', { class: 'ti ti-edit' })
                    ),
                    h('button', { class: 'icon-btn danger', onClick: () => emit('eliminar', row), title: 'Eliminar' },
                      h('i', { class: 'ti ti-trash' })
                    ),
                  ])
                ])
              ].filter(Boolean)))
            : [h('tr', {}, h('td', { colspan: 99, class: 'empty-row' }, 'Sin registros'))]
          )
        ])
      ])
    ])
  }
})

// ── Estado ───────────────────────────────────────────
const ENTIDADES = ['servicios','clientes','empresas','partidas','zonas','regiones','areas_geograficas']

const cache    = reactive(Object.fromEntries(ENTIDADES.map(e => [e, []])))
const loading  = reactive(Object.fromEntries(ENTIDADES.map(e => [e, true])))
const busquedas = reactive(Object.fromEntries(ENTIDADES.map(e => [e, ''])))
const estatus   = reactive(Object.fromEntries(ENTIDADES.map(e => [e, ''])))
const loadingDeps = ref(false)

const deps = reactive({
  empresas: [], partidas: [], zonas: [],
  clientes: [], regiones: [], areas_geograficas: [], regionales: []
})

const modalForm = reactive({
  open: false, modo: 'insert', entidad: '',
  data: {}, saving: false, alert: '', alertType: 'error'
})
const modalDetalle = reactive({ open: false, entidad: '', data: null })

// ── Schemas ──────────────────────────────────────────
const schemas = {
  empresas: { fields: [
    { name: 'empresa', label: 'Empresa', required: true, upper: true },
    { name: 'status',  label: 'Estatus', type: 'select', options: [['1','Activo'],['0','Inactivo']] },
  ]},
  partidas: { fields: [
    { name: 'partida', label: 'Partida', required: true, upper: true },
    { name: 'status',  label: 'Estatus', type: 'select', options: [['1','Activo'],['0','Inactivo']] },
  ]},
  zonas: { fields: [
    { name: 'zona',   label: 'Zona', required: true, upper: true },
    { name: 'status', label: 'Estatus', type: 'select', options: [['1','Activo'],['0','Inactivo']] },
  ]},
  regiones: { fields: [
    { name: 'estado',             label: 'Estado', required: true, upper: true },
    { name: 'id_area_geografica', label: 'Región', type: 'select', required: true, optionsFrom: ['areas_geograficas','region'] },
    { name: 'status',             label: 'Estatus', type: 'select', options: [['1','Activo'],['0','Inactivo']] },
  ]},
  clientes: { fields: [
    { name: 'razon_social', label: 'Razón social', required: true, upper: true },
    { name: 'nombre_corto', label: 'Nombre corto', required: true, upper: true },
    { name: 'id_empresa',   label: 'Empresa',  type: 'select', required: true, optionsFrom: ['empresas','empresa'] },
    { name: 'id_partida',   label: 'Partida',  type: 'select', required: true, optionsFrom: ['partidas','partida'] },
    { name: 'status',       label: 'Estatus',  type: 'select', options: [['1','Activo'],['0','Inactivo']] },
  ]},
  servicios: { fields: [
    { name: 'servicio',   label: 'Servicio',   required: true, upper: true },
    { name: 'elementos',  label: 'Elementos',  type: 'number' },
    { name: 'ubicacion',  label: 'Ubicación',  upper: true },
    { name: 'cp',         label: 'CP',         type: 'text' },
    { name: 'latitud',    label: 'Latitud',    type: 'text' },
    { name: 'longitud',   label: 'Longitud',   type: 'text' },
    { name: 'id_cliente', label: 'Cliente',    type: 'select', required: true, optionsFrom: ['clientes','nombre_corto'] },
    { name: 'id_empresa', label: 'Empresa',    type: 'select', required: true, optionsFrom: ['empresas','empresa'] },
    { name: 'id_partida', label: 'Partida',    type: 'select', optionsFrom: ['partidas','partida'] },
    { name: 'id_zona',    label: 'Zona',       type: 'select', optionsFrom: ['zonas','zona'] },
    { name: 'status',     label: 'Estatus',    type: 'select', options: [['1','Activo'],['0','Inactivo']] },
  ]},
  areas_geograficas: { fields: [] },
}

const currentSchema = computed(() => schemas[modalForm.entidad])

const modalMapa = reactive({ open: false, servicio: null })

function abrirMapa(row) {
  modalMapa.servicio = row
  modalMapa.open = true
}

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Parámetros', to: '/hospitales' }
  ])
  ENTIDADES.forEach(e => cargar(e))
})

// ── Cargar datos ─────────────────────────────────────
async function cargar(entidad) {
  loading[entidad] = true
  try {
    const endpoint = {
      servicios:         '/catalogos/servicios',
      clientes:          '/catalogos/clientes',
      empresas:          '/catalogos/empresas',
      partidas:          '/catalogos/partidas',
      zonas:             '/catalogos/zonas',
      regiones:          '/catalogos/regiones',
      areas_geograficas: '/catalogos/areas-geograficas',
    }[entidad]

    const { data } = await api.get(endpoint)
    cache[entidad]  = data.data || []
    deps[entidad]   = data.data || []
  } catch (err) {
    console.error(err)
    cache[entidad] = []
  } finally { loading[entidad] = false }
}

// ── Filtrar ──────────────────────────────────────────
function filtrar(entidad) {
  const q  = busquedas[entidad].toLowerCase().trim()
  const st = estatus[entidad]
  return (cache[entidad] || []).filter(r => {
    const okStatus = !st ? true : String(r.estatus ?? r.status ?? '') === st
    const okQ = !q ? true : Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
    return okStatus && okQ
  })
}

function abrirGoogleMaps() {
  const { latitud, longitud } = modalMapa.servicio
  window.open(`https://www.google.com/maps?q=${latitud},${longitud}`, '_blank', 'noopener')
}

// ── Modal form ───────────────────────────────────────
async function abrirModal(entidad, modo, row = null) {
  modalForm.entidad   = entidad
  modalForm.modo      = modo
  modalForm.alert     = ''
  modalForm.saving    = false

  // Asegurar deps
  loadingDeps.value = true
  await Promise.all(
    (schemas[entidad]?.fields || [])
      .filter(f => f.optionsFrom)
      .map(f => {
        const key = f.optionsFrom[0]
        if (!deps[key]?.length) return cargar(key)
        return Promise.resolve()
      })
  )
  loadingDeps.value = false

  if (modo === 'insert') {
    const defaults = {}
    schemas[entidad]?.fields?.forEach(f => {
      defaults[f.name] = f.options?.[0]?.[0] ?? ''
    })
    modalForm.data = defaults
  } else {
    modalForm.data = {
      ...row,
      status: String(row?.estatus ?? row?.status ?? '1'),
      id_empresa: String(row?.id_empresa ?? ''),
      id_partida: String(row?.id_partida ?? ''),
      id_zona:    String(row?.id_zona    ?? ''),
      id_cliente: String(row?.id_cliente ?? ''),
      id_area_geografica: String(row?.id_area_geografica ?? row?.id_region ?? ''),
    }
  }

  modalForm.open = true
}

async function guardarModal() {
  modalForm.saving = true
  modalForm.alert  = ''
  try {
    const { id, ...payload } = modalForm.data
    const endpoint = {
      servicios: '/catalogos/servicios',
      clientes:  '/catalogos/clientes',
      empresas:  '/catalogos/empresas',
      partidas:  '/catalogos/partidas',
      zonas:     '/catalogos/zonas',
      regiones:  '/catalogos/regiones',
    }[modalForm.entidad]

    if (modalForm.modo === 'insert') {
      await api.post(endpoint, payload)
    } else {
      await api.put(`${endpoint}/${id}`, payload)
    }

    modalForm.open = false
    await cargar(modalForm.entidad)

    // Recargar deps que usen esta entidad
    const depsDe = { empresas: ['clientes','servicios'], partidas: ['clientes','servicios'], zonas: ['servicios'], clientes: ['servicios'] }
    const recargar = depsDe[modalForm.entidad] || []
    recargar.forEach(e => cargar(e))

  } catch (err) {
    modalForm.alert     = err.response?.data?.message || 'Error al guardar'
    modalForm.alertType = 'error'
  } finally { modalForm.saving = false }
}

async function eliminar(entidad, row) {
  const ok = confirm(`¿Eliminar "${row.empresa || row.zona || row.partida || row.servicio || row.nombre_corto || row.estado || row.id}"?`)
  if (!ok) return
  try {
    const endpoint = {
      servicios: `/catalogos/servicios/${row.id}`,
      clientes:  `/catalogos/clientes/${row.id}`,
      empresas:  `/catalogos/empresas/${row.id}`,
      partidas:  `/catalogos/partidas/${row.id}`,
      zonas:     `/catalogos/zonas/${row.id}`,
      regiones:  `/catalogos/regiones/${row.id}`,
    }[entidad]
    await api.delete(endpoint)
    await cargar(entidad)
  } catch (err) {
    alert(err.response?.data?.message || 'Error al eliminar')
  }
}

function abrirDetalle(entidad, row) {
  modalDetalle.entidad = entidad
  modalDetalle.data    = row
  modalDetalle.open    = true
}

function getDepOptions(optionsFrom) {
  const [key] = optionsFrom
  return deps[key] || cache[key] || []
}
</script>

<style scoped>
.params-view { display: flex; flex-direction: column; gap: 14px; }
.view-header  { display: flex; align-items: center; justify-content: space-between; }
.view-title   { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub     { font-size: 12px; color: var(--tx2); margin-top: 3px; }

/* Grid */
.params-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.full-width { grid-column: 1 / -1; }

/* Sección */
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }

/* CatalogoSeccion */
:deep(.cat-sec) { display: flex; flex-direction: column; }
:deep(.cat-sec-hdr) {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-bottom: 0.5px solid var(--bdr); flex-wrap: wrap;
}
:deep(.cat-sec-title) { font-size: 13px; font-weight: 500; color: var(--tx0); flex-shrink: 0; }
:deep(.cat-sec-actions) { margin-left: auto; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
:deep(.search-box-sm) {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 4px 8px;
}
:deep(.search-box-sm i)     { font-size: 13px; color: var(--tx2); }
:deep(.search-box-sm input) {
  background: transparent; border: none; outline: none;
  font-size: 12px; color: var(--tx0); width: 120px; font-family: inherit;
}
:deep(.sel-sm) {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 4px 7px;
  font-size: 11px; color: var(--tx1); outline: none; font-family: inherit;
}
:deep(.btn-nuevo) {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 12px; color: #fff;
  cursor: pointer; font-family: inherit; transition: background .15s;
}
:deep(.btn-nuevo:hover) { background: var(--acc2); }

/* Tabla */
:deep(.table-wrap) {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 320px;
}

:deep(table) { width: 100%; border-collapse: collapse; }
:deep(th) {
  padding: 7px 12px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr); white-space: nowrap;
  position: sticky; top: 0; background: var(--bg1); z-index: 1;
}
:deep(td) {
  padding: 9px 12px; font-size: 12px;
  border-bottom: 0.5px solid var(--bdr); color: var(--tx0);
}
:deep(tbody tr) { transition: background .12s; }
:deep(tbody tr:hover td) { background: var(--bg2); }
:deep(tbody tr:last-child td) { border-bottom: none; }
:deep(.mono)      { font-family: monospace; font-size: 11px; color: var(--tx2); }
:deep(.empty-row) { text-align: center; color: var(--tx2); padding: 28px; font-size: 12px; }
:deep(.row-actions) { display: flex; gap: 4px; justify-content: flex-end; }
:deep(.icon-btn) {
  width: 26px; height: 26px; border-radius: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 13px; transition: all .15s;
}
:deep(.icon-btn.accent) { color: var(--acc); }
:deep(.icon-btn.danger) { color: var(--red); }
:deep(.icon-btn:hover)  { background: var(--bg3); }

/* Skeleton */
:deep(.skeleton-wrap) { padding: 10px; }
:deep(.skeleton-row) {
  background: var(--bg2); border-radius: 6px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%; max-width: 480px;
  display: flex; flex-direction: column; overflow: hidden; max-height: 90vh;
}
.modal-box.lg { max-width: 680px; }
.modal-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 0.5px solid var(--bdr); flex-shrink: 0;
}
.modal-icon {
  width: 34px; height: 34px; border-radius: 10px;
  background: var(--acc-dim); color: var(--acc);
  display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0;
}
.modal-icon.blue { background: var(--acc-dim); color: var(--acc); }
.modal-title { font-size: 14px; font-weight: 600; color: var(--tx0); text-transform: capitalize; }
.modal-sub   { font-size: 11px; color: var(--tx2); }
.modal-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg3); border: none; cursor: pointer;
  color: var(--tx2); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.modal-body-scroll { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.modal-alert {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 8px; font-size: 13px;
  background: var(--red-dim); border: 0.5px solid var(--red); color: var(--red);
}
.modal-footer {
  padding: 12px 18px; border-top: 0.5px solid var(--bdr);
  display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0;
}

/* Fields */
.field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field-full { grid-column: 1 / -1; }
label  { font-size: 12px; font-weight: 500; color: var(--tx1); }
.req   { color: var(--red); }
input, select {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 7px 10px;
  font-size: 13px; color: var(--tx0); outline: none;
  font-family: inherit; transition: border .15s; width: 100%;
}
input:focus, select:focus { border-color: var(--acc); }
select option { background: var(--bg1); }

/* Detail */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label { font-size: 10px; color: var(--tx3); text-transform: uppercase; letter-spacing: .7px; }
.detail-val   { font-size: 12px; color: var(--tx0); word-break: break-all; }

/* Botones */
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer; transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .params-grid { grid-template-columns: 1fr; }
  .field-grid-2 { grid-template-columns: 1fr; }
  .detail-grid  { grid-template-columns: 1fr; }
}
</style>