<template>
  <div class="masiva-view">

    <!-- Header -->
    <div class="view-header">
      <button class="btn-back" @click="router.back()">
        <i class="ti ti-arrow-left" aria-hidden="true"></i>
      </button>
      <div>
        <h1 class="view-title">{{ config.titulo }}</h1>
        <p class="view-sub">{{ config.descripcion }}</p>
      </div>
    </div>

    <!-- ═══ Candado de clave ═══ -->
    <div v-if="!desbloqueado" class="sec candado-sec">
      <div class="dz-icon" style="margin: 32px auto 12px;">
        <i class="ti ti-lock" aria-hidden="true"></i>
      </div>
      <p class="dz-title" style="text-align:center">Esta carga masiva requiere clave de acceso</p>
      <p class="dz-hint" style="text-align:center; margin-bottom:16px;">
        Ingresa la clave de importación para continuar.
      </p>
      <div style="max-width:320px; margin:0 auto; padding-bottom:32px;">
        <input
          v-model="claveIngresada"
          type="password"
          placeholder="Clave de acceso"
          class="input-clave"
          @keyup.enter="verificarClave"
        />
        <button class="btn-primary-lg" style="width:100%; justify-content:center; margin-top:10px;" @click="verificarClave" :disabled="!claveIngresada">
          Desbloquear
        </button>
        <p v-if="errorClave" style="color:var(--red); font-size:12px; margin-top:8px; text-align:center;">{{ errorClave }}</p>
      </div>
    </div>

    <template v-else>
      <!-- Drop zone -->
      <div class="sec">
        <div
          class="dropzone"
          :class="{ 'drag-over': dragOver, 'has-file': archivo, 'has-error': errores.length > 0, 'has-success': archivo && errores.length === 0 && validado }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
          @click="fileInputRef?.click()"
        >
          <template v-if="!archivo">
            <div class="dz-icon">
              <i class="ti ti-cloud-upload" aria-hidden="true"></i>
            </div>
            <p class="dz-title">Suelta el archivo aquí o haz clic para cargarlo</p>
            <p class="dz-hint">Acepta archivos .xlsx · .xls</p>
          </template>
          <template v-else>
            <div class="file-info">
              <div class="file-icon">
                <i class="ti ti-file-spreadsheet" aria-hidden="true"></i>
              </div>
              <div>
                <p class="file-name">{{ archivo.name }}</p>
                <p class="file-size">{{ formatSize(archivo.size) }} · {{ filas.length }} filas detectadas</p>
              </div>
              <button class="file-remove" @click.stop="resetTodo">
                <i class="ti ti-x"></i>
              </button>
            </div>
          </template>
        </div>
        <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.xlsm" style="display:none" @change="onFileChange" />
      </div>

      <!-- Banner éxito validación -->
      <div v-if="archivo && validado && errores.length === 0" class="banner-success">
        <i class="ti ti-circle-check" aria-hidden="true"></i>
        <div>
          <p style="font-weight:500">Plantilla válida — {{ filas.length }} registros listos para procesar</p>
          <p style="font-size:11px;opacity:.8">Sin errores detectados. Puedes enviar o solo validar contra el servidor.</p>
        </div>
      </div>

      <!-- Progreso upload -->
      <div v-if="uploading" class="progreso-wrap">
        <div class="progreso-info">
          <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
          <span>{{ progresoTexto }}</span>
          <span class="progreso-pct">{{ progresoPct }}%</span>
        </div>
        <div class="progreso-bar">
          <div class="progreso-fill" :style="{ width: progresoPct + '%' }"></div>
        </div>
      </div>

      <!-- Acciones -->
      <div v-if="archivo" class="acciones">
        <button class="btn-sm" @click="resetTodo" :disabled="uploading">
          <i class="ti ti-eraser" aria-hidden="true"></i> Resetear
        </button>
        <button v-if="tipo !== 'nuevos_directo'" class="btn-sm" :disabled="!validado || errores.length > 0 || uploading" @click="enviar(true)">
          <i class="ti ti-check" aria-hidden="true"></i> Solo validar
        </button>
        <button class="btn-primary-lg" :disabled="!validado || errores.length > 0 || uploading" @click="enviar(false)">
          <i class="ti ti-loader-2 spin" v-if="uploading" aria-hidden="true"></i>
          <i class="ti ti-send" v-else aria-hidden="true"></i>
          {{ uploading ? progresoTexto : 'Enviar' }}
        </button>
      </div>

      <!-- Tabla de errores -->
      <div v-if="errores.length > 0" class="sec">
        <div class="sec-hdr error">
          <i class="ti ti-alert-triangle" aria-hidden="true"></i>
          <span>La plantilla tiene errores</span>
          <span class="error-count">{{ errores.length }} errores</span>
          <button class="btn-sm" style="margin-left:auto" @click="exportarErrores">
            <i class="ti ti-download" aria-hidden="true"></i> Exportar errores
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:80px">Fila</th>
                <th>Error detectado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in errores" :key="i">
                <td class="mono" style="color:var(--red)">{{ e.fila }}</td>
                <td style="color:var(--tx1)">{{ e.mensaje }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Resultado del servidor -->
      <div v-if="resultado" class="sec">
        <div class="sec-hdr" :class="resultado.ok ? 'success' : 'error'">
          <i :class="['ti', resultado.ok ? 'ti-circle-check' : 'ti-alert-triangle']" aria-hidden="true"></i>
          <span>{{ resultado.validateOnly ? 'Resultado de validación' : 'Resultado de carga masiva' }}</span>
        </div>
        <div class="resultado-stats">
          <div class="rstat blue">
            <span class="rstat-num">{{ resultado.total }}</span>
            <span>Total</span>
          </div>
          <div class="rstat green">
            <span class="rstat-num">{{ resultado.insertados }}</span>
            <span>Insertados</span>
          </div>
          <div class="rstat amber">
            <span class="rstat-num">{{ resultado.duplicados }}</span>
            <span>Duplicados</span>
          </div>
          <div class="rstat red">
            <span class="rstat-num">{{ resultado.errores }}</span>
            <span>Errores</span>
          </div>
        </div>
        <div v-if="resultado.erroresDetalle?.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:80px">Fila</th>
                <th>Error del servidor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in resultado.erroresDetalle" :key="i">
                <td class="mono" style="color:var(--red)">{{ e.fila }}</td>
                <td style="color:var(--tx1)">{{ e.mensaje }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.js'
import * as XLSX from 'xlsx'

const route  = useRoute()
const router = useRouter()
const ui     = useUiStore()

const API_BASE = '/api/v1'
const FIRMA_ESPERADA = 'SIAG2026*'

const fileInputRef  = ref(null)
const dragOver      = ref(false)
const archivo       = ref(null)
const filas         = ref([])
const errores       = ref([])
const validado      = ref(false)
const uploading     = ref(false)
const progresoPct   = ref(0)
const progresoTexto = ref('Enviando...')
const resultado     = ref(null)
let   datosValidados = []
let   erroresUltimos = []

// Config por tipo de importación
const CONFIGS = {
  nuevos: {
    titulo:      'Nuevos empleados',
    descripcion: 'Carga masiva de nuevos empleados desde archivo Excel predefinido',
    endpoint:    '/empleados/masivo',
    action:      'empleado_masivo',
  },
  actualizacion: {
    titulo:      'Actualización de empleados',
    descripcion: 'Actualización masiva de datos de empleados desde archivo Excel',
    endpoint:    '/empleados/masivo',
    action:      'empleado_masivo_update',
  },
  bajas: {
    titulo:      'Baja de empleados',
    descripcion: 'Baja masiva de empleados listados en el archivo Excel',
    endpoint:    '/empleados/baja-masiva',
    action:      'empleado_baja_masiva',
  },
  ubicaciones: {
    titulo:      'Ubicaciones / Servicios',
    descripcion: 'Carga masiva de servicios y ubicaciones desde archivo Excel predefinido',
    endpoint:    '/catalogos/servicios/masivo',
    action:      'servicio_masivo',
  },
  nuevos_directo: {
    titulo:      'Carga directa (sin validar)',
    descripcion: '⚠️ Inserta los datos tal cual vienen, sin ninguna validación. Úsalo solo si estás 100% seguro del origen de los datos.',
    endpoint:    '/empleados/masivo-directo',
    action:      'empleado_masivo_directo',
  },
  actualizar_dinamico: {
    titulo:      'Actualización dinámica de empleados',
    descripcion: 'Sube un Excel con columna "id" + las columnas que quieras actualizar (sueldo, fechas, teléfono, lo que sea)',
    endpoint:    '/empleados/actualizar-masivo-dinamico',
    action:      'empleado_actualizar_dinamico',
  },
}



const tipo   = computed(() => route.query.tipo || 'nuevos')
const config = computed(() => CONFIGS[tipo.value] || CONFIGS.nuevos)

// ── Candado ──────────────────────────────────────────
const desbloqueado   = ref(false)
const claveIngresada = ref('')
const claveGuardada  = ref('')
const errorClave     = ref('')

function verificarClave() {
  if (!claveIngresada.value) return
  claveGuardada.value = claveIngresada.value
  desbloqueado.value = true
  errorClave.value = ''
}

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home',          to: '/' },
    { label: 'Importaciones', to: '/importaciones' },
    { label: config.value.titulo, to: '#' }
  ])
})

// ── Drag & Drop ──────────────────────────────────────
function onDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer.files?.[0]
  if (file) procesarArchivo(file)
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) procesarArchivo(file)
  e.target.value = ''
}

function mapearSinValidar(rows) {
  datosValidados = rows.map((fila, i) => {
    const sueldo = safe(fila.salario_mensual).replace(/[^\d.]/g, '') // solo números y punto decimal
    const salarioMensual = sueldo ? parseFloat(sueldo) : null
    const modoSueldo = salarioMensual && salarioMensual > 0 ? 'salario' : 'tabulador'

    return {
      _row:                i + 2,
      nombre:               normalizarTexto(fila.Nombre),
      paterno:              normalizarTexto(fila.Paterno),
      materno:              normalizarTexto(fila.Materno),
      curp:                 normalizarTexto(fila.CURP),
      rfc:                  normalizarTexto(fila.RFC),
      nss:                  safe(fila.NSS).replace(/\D/g, ''),
      cp:                   safe(fila.CP_Fiscal).replace(/\D/g, ''),
      fecha_ingreso:        toISODate(fila.Fecha_Alta) || '',
      interbancaria:        safe(fila.Clabe_Interbancaria).replace(/\D/g, ''),
      alergias:             normalizarTexto(fila.Alergia) || 'N/A',
      turno:                safe(fila.id_turno || fila.Turno),
      puesto:               safe(fila.id_puesto || fila.Puesto),
      periodicidad:         safe(fila.id_periodicidad || fila.Periodicidad),
      escolaridad:          safe(fila.id_escolaridad || fila.Escolaridad),
      tipoSangre:            safe(fila.id_tiposangre  || fila.Tipo_sangre),
      parentesco:            safe(fila.id_parentesco  || fila.Parentesco),
      nombreEmergencia:      normalizarTexto(fila.Nombre_Emergencia),
      telefonoEmergencia:    safe(fila.Telefono_Emergencia).replace(/\D/g, ''),
      salario_mensual:       salarioMensual,
      modo_sueldo:           modoSueldo,
    }
  })

  errores.value  = []
  erroresUltimos = []
  validado.value = true
}

// ── Procesar Excel ───────────────────────────────────
function procesarArchivo(file) {
  resetTodo()
  archivo.value = file

  const reader = new FileReader()
  reader.onload = (e) => {
    const data     = new Uint8Array(e.target.result)
    const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' })

    if (!validarFirma(workbook)) {
      archivo.value = null
      return
    }

    const { headers, rows } = leerFilas(workbook)
    if (!headers.length) {
      errores.value = [{ fila: 1, mensaje: 'No se detectaron encabezados en la fila 1' }]
      return
    }

    filas.value = rows

    if (tipo.value === 'ubicaciones') {
      validarServiciosFrontend(rows)
    } else if (tipo.value === 'nuevos_directo') {
      mapearSinValidar(rows)
    } else if (tipo.value === 'actualizar_dinamico') {   // 👈 esta rama
      validarActualizacionDinamica(rows, headers)          // 👈 y esta llamada
    } else {
      validarFrontend(rows)
    }
  }
  reader.readAsArrayBuffer(file)
}

// ── Validación para actualización dinámica -- SIN mapeo fijo de columnas.
// Solo exige que exista una columna "id". El resto de las columnas se
// pasan tal cual vengan (el backend filtra por su lista blanca).
function validarActualizacionDinamica(rows, headers) {
  const errs = []
  datosValidados = []

  // Busca la columna "id" sin importar mayúsculas/minúsculas
  const headerId = headers.find(h => h.trim().toLowerCase() === 'id')
  if (!headerId) {
    errores.value  = [{ fila: 1, mensaje: "El archivo debe traer una columna llamada 'id'" }]
    erroresUltimos = errores.value
    validado.value = true
    return
  }

  rows.forEach((fila, i) => {
    const n = i + 2
    const idRaw = safe(fila[headerId]).replace(/\D/g, '')

    if (!idRaw) {
      errs.push({ fila: n, mensaje: 'Fila sin id válido -- se omite' })
      return
    }

    const obj = { _row: n, id: parseInt(idRaw, 10) }

    headers.forEach(h => {
      if (h === headerId) return

      let valor = fila[h]

      if (valor instanceof Date) {
        valor = toISODate(valor)
      } else {
        valor = safe(valor)
      }

      if (valor !== '') obj[h] = valor
    })

    datosValidados.push(obj)
  })

  errores.value  = errs
  erroresUltimos = errs
  validado.value = true
}

// ── ÚNICA definición de xhrConProgreso (ya con el header de clave) ──
function xhrConProgreso(url, body, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('X-Import-Key', claveGuardada.value)

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return
      onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onerror = () => reject(new Error('Error de red'))
    xhr.onload  = () => {
      let json = {}
      try { json = JSON.parse(xhr.responseText || '{}') } catch {}
      if (xhr.status === 403) {
        reject(new Error('CLAVE_INCORRECTA'))
        return
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(json?.message || json?.mensaje || `HTTP ${xhr.status}`))
        return
      }
      resolve(json)
    }
    xhr.send(body)
  })
}

function validarFirma(workbook) {
  const ws = workbook.Sheets['catalogos'] || workbook.Sheets['Catalogos']
  if (!ws) {
    alert('Archivo inválido: no existe la hoja "catalogos"')
    return false
  }
  const cell = ws['F225']
  const val  = String(cell?.w ?? cell?.v ?? '').trim()
  if (norm(val) !== norm(FIRMA_ESPERADA)) {
    alert('Firma inválida — plantilla no autorizada')
    return false
  }
  return true
}

function leerFilas(workbook, sheetName = 'Plantilla', startRow = 1) {
  const ws = workbook.Sheets[sheetName] ||
             workbook.Sheets['CARGA']   ||
             workbook.Sheets[workbook.SheetNames[0]]
  if (!ws) return { headers: [], rows: [] }

  const aoa     = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const headers = (aoa[0] || []).map(h => String(h ?? '').trim()).filter(Boolean)
  const rows    = aoa.slice(startRow)
    .filter(r => r.some(c => String(c ?? '').trim() !== ''))
    .map(r => {
      const obj = {}
      headers.forEach((h, i) => obj[h] = r[i] ?? '')
      return obj
    })

  return { headers, rows }
}

// ── Agrega esto DENTRO del forEach de validarFrontend(), justo después
// de donde ya declaras id_turno/id_puesto/id_periodicidad ──
function validarFrontend(rows) {
  const errs = []
  datosValidados = []
  const seenCURP = new Set()
  const seenRFC  = new Set()
  const seenNSS  = new Set()

  rows.forEach((fila, i) => {
    const n = i + 2
    const nombre  = safe(fila.Nombre)
    const paterno = safe(fila.Paterno)
    const materno = safe(fila.Materno)
    const curp    = safe(fila.CURP).toUpperCase()
    const rfc     = safe(fila.RFC).toUpperCase()
    const nss     = safe(fila.NSS).replace(/\D/g, '')
    const cp      = safe(fila.CP_Fiscal).replace(/\D/g, '')
    const clabe   = safe(fila.Clabe_Interbancaria).replace(/\D/g, '')
    const tel     = safe(fila.Telefono_Emergencia).replace(/\D/g, '')
    const fecha   = toISODate(fila.Fecha_Alta)
    const id_turno        = safe(fila.id_turno || fila.Turno)
    const id_puesto       = safe(fila.id_puesto || fila.Puesto)
    const id_periodicidad = safe(fila.id_periodicidad || fila.Periodicidad)

    // 👇 NUEVO -- salario_mensual: header exacto 'salario_mensual'
    const sueldoRaw = safe(fila.salario_mensual).replace(/[^\d.]/g, '')
    const salarioMensual = sueldoRaw ? parseFloat(sueldoRaw) : null
    const modoSueldo = salarioMensual && salarioMensual > 0 ? 'salario' : 'tabulador'

    if (!paterno || !nombre) errs.push({ fila: n, mensaje: 'Nombre incompleto (Paterno o Nombre vacío)' })
    if (nss   && !/^\d{11}$/.test(nss))   errs.push({ fila: n, mensaje: `NSS inválido (${nss})` })
    if (cp    && !/^\d{5}$/.test(cp))     errs.push({ fila: n, mensaje: `CP inválido (${cp})` })
    if (clabe && !/^\d{18}$/.test(clabe)) errs.push({ fila: n, mensaje: `CLABE inválida (${clabe})` })
    if (tel   && !/^\d{10}$/.test(tel))   errs.push({ fila: n, mensaje: `Teléfono emergencia inválido (${tel})` })
    if (fecha && isNaN(Date.parse(fecha))) errs.push({ fila: n, mensaje: `Fecha inválida (${fecha})` })
    if (!id_turno)        errs.push({ fila: n, mensaje: 'id_turno es obligatorio' })
    if (!id_puesto)       errs.push({ fila: n, mensaje: 'id_puesto es obligatorio' })
    if (!id_periodicidad) errs.push({ fila: n, mensaje: 'id_periodicidad es obligatorio' })

    if (curp) {
      const m = explicarCURP(curp)
      if (m) errs.push({ fila: n, mensaje: `CURP inválido. ${m}` })
      if (seenCURP.has(curp)) errs.push({ fila: n, mensaje: `CURP duplicado en archivo (${curp})` })
      else seenCURP.add(curp)
    }

    if (rfc && curp) {
      const m = rfcVsCurp(rfc, curp)
      if (m) errs.push({ fila: n, mensaje: m })
      if (seenRFC.has(rfc)) errs.push({ fila: n, mensaje: `RFC duplicado (${rfc})` })
      else seenRFC.add(rfc)
    }

    if (nss && seenNSS.has(nss)) errs.push({ fila: n, mensaje: `NSS duplicado (${nss})` })
    else if (nss) seenNSS.add(nss)

    datosValidados.push({
      _row:               n,
      nombre, paterno, materno, curp, rfc, nss, cp,
      fecha_ingreso:      fecha || '',
      interbancaria:      clabe || '',
      alergias:           safe(fila.Alergia) || 'N/A',
      turno:              id_turno,
      puesto:             id_puesto,
      periodicidad:       id_periodicidad,
      escolaridad:        safe(fila.id_escolaridad || fila.Escolaridad),
      tipoSangre:         safe(fila.id_tiposangre  || fila.Tipo_sangre),
      parentesco:         safe(fila.id_parentesco  || fila.Parentesco),
      nombreEmergencia:   safe(fila.Nombre_Emergencia),
      telefonoEmergencia: tel,
      salario_mensual:    salarioMensual,   // 👈 NUEVO
      modo_sueldo:        modoSueldo,       // 👈 NUEVO
    })
  })

  errores.value    = errs
  erroresUltimos   = errs
  validado.value   = true
}

// ── Validación frontend para servicios/ubicaciones ──────
function validarServiciosFrontend(rows) {
  const errs = []
  datosValidados = []
  const seenServicioZona = new Set()

  rows.forEach((fila, i) => {
    const n = i + 2

    const servicio  = normalizarTexto(fila.servicio)
    const ubicacion = normalizarTexto(fila.ubicacion || fila['Ubicación'] || '')
    const elementos = safe(fila.elementos).replace(/\D/g, '')
    const cp        = safe(fila.cp).replace(/\D/g, '')
    const idCliente = safe(fila.id_cliente)
    const idEmpresa = safe(fila.id_empresa)
    const idPartida = safe(fila.id_partida)
    const idZona    = safe(fila.id_zona)
    const latitud   = safe(fila.latitud) || '0'
    const longitud  = safe(fila.longitud) || '0'

    if (!servicio)   errs.push({ fila: n, mensaje: 'Servicio (nombre) es obligatorio' })
    if (!idCliente)  errs.push({ fila: n, mensaje: 'id_cliente es obligatorio' })
    if (!idEmpresa)  errs.push({ fila: n, mensaje: 'id_empresa es obligatorio' })
    if (!idPartida)  errs.push({ fila: n, mensaje: 'id_partida es obligatorio' })
    if (!idZona)     errs.push({ fila: n, mensaje: 'id_zona es obligatorio' })
    if (cp && !/^\d{5}$/.test(cp)) errs.push({ fila: n, mensaje: `CP inválido (${cp})` })

    const claveDup = `${servicio}__${idZona}`
    if (servicio && idZona) {
      if (seenServicioZona.has(claveDup)) {
        errs.push({ fila: n, mensaje: `Servicio duplicado en archivo (${servicio}, zona ${idZona})` })
      } else {
        seenServicioZona.add(claveDup)
      }
    }

    datosValidados.push({
      _row:       n,
      servicio, ubicacion, elementos, cp,
      id_cliente: idCliente,
      id_empresa: idEmpresa,
      id_partida: idPartida,
      id_zona:    idZona,
      latitud, longitud,
    })
  })

  errores.value  = errs
  erroresUltimos = errs
  validado.value = true
}

// ── Envío al servidor POR LOTES de 100 (reemplaza tu enviar() actual) ──
const TAMANO_LOTE = 100

async function enviar(validateOnly = false) {
  if (!datosValidados.length) return

  uploading.value   = true
  progresoPct.value = 0
  resultado.value   = null

  const token = localStorage.getItem('access_token')

  // Parte datosValidados en lotes de 100
  const lotes = []
  for (let i = 0; i < datosValidados.length; i += TAMANO_LOTE) {
    lotes.push(datosValidados.slice(i, i + TAMANO_LOTE))
  }

  const totalLotes = lotes.length
  let totalAcum      = 0
  let insertadosAcum = 0
  let duplicadosAcum = 0
  let erroresAcum    = 0
  let detalleAcum    = []
  let huboErrorFatal = false

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i]
    progresoTexto.value = `${validateOnly ? 'Validando' : 'Enviando'} lote ${i + 1} de ${totalLotes} (${lote.length} filas)...`
    progresoPct.value   = Math.round((i / totalLotes) * 100)

    const payload = JSON.stringify(
      tipo.value === 'ubicaciones'
        ? {
            action:         config.value.action,
            validate_only:  validateOnly,
            fail_threshold: 0.80,
            all_or_nothing: false,
            servicios:      lote,
          }
        : {
            action:         config.value.action,
            validate_only:  validateOnly,
            fail_threshold: 0.80,
            all_or_nothing: false,
            empleados:      lote,
          }
    )

    try {
      const res = await xhrSimple(`${API_BASE}${config.value.endpoint}`, payload, token)

      totalAcum      += res.total      ?? lote.length
      insertadosAcum += res.insertados ?? 0
      duplicadosAcum += res.duplicados ?? 0
      erroresAcum    += res.errores    ?? 0

      const detalleLote = Array.isArray(res.detalle) ? res.detalle : []
      detalleAcum = detalleAcum.concat(
        detalleLote.filter(x => x.status !== 'ok').map(x => ({ fila: x.row ?? '—', mensaje: x.message ?? 'Error' }))
      )

    } catch (err) {
      if (err.message === 'CLAVE_INCORRECTA') {
        errorClave.value = 'Clave de acceso incorrecta'
        desbloqueado.value = false
        claveIngresada.value = ''


        if (!validateOnly) {
          const tablaDestino = tipo.value === 'ubicaciones' ? 'servicios' : 'empleados'
          try {
            await fetch(`${API_BASE}/importaciones/historial`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                tipo:           tipo.value,
                tabla_destino:  tablaDestino,
                archivo:        archivo.value?.name || '',
                total:          totalAcum,
                insertados:     insertadosAcum,
                duplicados:     duplicadosAcum,
                errores:        erroresAcum,
                validate_only:  false,
                ok:             !huboErrorFatal,
              }),
            })
          } catch (e) {
            // Si falla el registro del historial, no interrumpimos el flujo --
            // la carga ya se hizo, solo no queda registrada en la tabla visual.
            console.warn('No se pudo registrar el historial:', e)
          }
        }
        
        uploading.value = false
        return
      }
      // Un lote falló completo (ej. error de red momentáneo) -- lo registramos
      // y CONTINUAMOS con los siguientes lotes, no abortamos todo el proceso.
      huboErrorFatal = true
      erroresAcum += lote.length
      detalleAcum.push({ fila: `Lote ${i + 1}`, mensaje: `Lote completo falló: ${err.message}` })
    }
  }

  progresoPct.value = 100
  progresoTexto.value = 'Completado'

  resultado.value = {
    ok:             !huboErrorFatal,
    validateOnly,
    total:          totalAcum,
    insertados:     insertadosAcum,
    duplicados:     duplicadosAcum,
    errores:        erroresAcum,
    erroresDetalle: detalleAcum,
  }

  if (detalleAcum.length) {
    errores.value  = detalleAcum
    erroresUltimos = detalleAcum
    exportarErrores()
  }

  uploading.value = false
}

// ── Versión simple de XHR (sin barra de progreso de bytes -- cada lote
//    de 100 filas es chico y rápido, la barra global ya la maneja enviar()) ──
function xhrSimple(url, body, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('X-Import-Key', claveGuardada.value)

    xhr.onerror = () => reject(new Error('Error de red'))
    xhr.onload  = () => {
      let json = {}
      try { json = JSON.parse(xhr.responseText || '{}') } catch {}
      if (xhr.status === 403) {
        reject(new Error('CLAVE_INCORRECTA'))
        return
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(json?.message || json?.mensaje || `HTTP ${xhr.status}`))
        return
      }
      resolve(json)
    }
    xhr.send(body)
  })
}

// ── Exportar errores ─────────────────────────────────
function exportarErrores() {
  if (!erroresUltimos.length) return
  const rows = [['Fila', 'Error'], ...erroresUltimos.map(e => [e.fila, e.mensaje])]
  const wb   = XLSX.utils.book_new()
  const ws   = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'ERRORES')
  XLSX.writeFile(wb, `errores_${tipo.value}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── Reset ────────────────────────────────────────────
function resetTodo() {
  archivo.value       = null
  filas.value         = []
  errores.value       = []
  validado.value      = false
  uploading.value     = false
  progresoPct.value   = 0
  resultado.value     = null
  datosValidados      = []
  erroresUltimos      = []
}

// ── Helpers ──────────────────────────────────────────
function norm(s) {
  return String(s ?? '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
}
function safe(v) { return String(v ?? '').trim() }

// Normaliza texto: quita acentos, colapsa espacios, mayúsculas (para servicios/ubicaciones)
function normalizarTexto(s) {
  return String(s ?? '').trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function toISODate(val) {
  if (!val && val !== 0) return ''
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10)
  }
  if (typeof val === 'number') {
    const p = XLSX.SSF?.parse_date_code?.(val)
    if (p?.y) return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`
  }
  return safe(val)
}

function explicarCURP(curp) {
  if (curp.length !== 18) return `Longitud incorrecta: ${curp.length} chars, deben ser 18`
  if (!/^[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]\d$/.test(curp)) return 'Estructura inválida'
  return ''
}

function rfcVsCurp(rfc, curp) {
  if (rfc.length !== 13) return ''
  const rf = rfc.slice(4, 10)
  const cf = curp.slice(4, 10)
  if (!/^\d{6}$/.test(rf)) return 'RFC: la fecha (pos 5-10) no tiene 6 dígitos'
  if (!/^\d{6}$/.test(cf)) return 'CURP: la fecha (pos 5-10) no tiene 6 dígitos'
  if (rf !== cf) return `RFC/CURP no coinciden: RFC=${rf}, CURP=${cf}`
  return ''
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
</script>

<style scoped>
.masiva-view { display: flex; flex-direction: column; gap: 14px; }

.view-header { display: flex; align-items: center; gap: 12px; }
.btn-back {
  width: 36px; height: 36px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx1); font-size: 18px; flex-shrink: 0; transition: all .15s;
}
.btn-back:hover { background: var(--bg3); }
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }

/* Dropzone */
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }

.dropzone {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 48px 24px; cursor: pointer;
  border: 2px dashed var(--bdr2); border-radius: 12px;
  background: var(--bg1); transition: all .2s;
  text-align: center;
}
.dropzone:hover, .dropzone.drag-over {
  border-color: var(--acc); background: var(--acc-dim);
}
.dropzone.has-error   { border-color: var(--red);  border-style: solid; }
.dropzone.has-success { border-color: var(--grn); border-style: solid; background: var(--grn-dim); }

.dz-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--acc-dim); color: var(--acc);
  display: flex; align-items: center; justify-content: center; font-size: 28px;
}
.dz-title { font-size: 15px; font-weight: 500; color: var(--tx0); }
.dz-hint  { font-size: 12px; color: var(--tx2); }

.file-info {
  display: flex; align-items: center; gap: 12px; width: 100%;
}
.file-icon {
  width: 48px; height: 48px; border-radius: 10px;
  background: var(--grn-dim); color: var(--grn);
  display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;
}
.file-name { font-size: 14px; font-weight: 500; color: var(--tx0); }
.file-size { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.file-remove {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: var(--red-dim); border: none; cursor: pointer;
  color: var(--red); font-size: 16px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

/* Banner éxito */
.banner-success {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 10px;
  background: var(--grn-dim); border: 0.5px solid var(--grn);
  color: var(--grn); font-size: 13px;
}
.banner-success i { font-size: 22px; flex-shrink: 0; }

/* Progreso */
.progreso-wrap {
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 10px; padding: 14px 16px;
}
.progreso-info {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--tx1); margin-bottom: 8px;
}
.progreso-pct { margin-left: auto; font-weight: 500; color: var(--acc); }
.progreso-bar {
  height: 6px; background: var(--bg3); border-radius: 6px; overflow: hidden;
}
.progreso-fill {
  height: 100%; background: var(--acc); border-radius: 6px;
  transition: width .3s ease;
}

/* Acciones */
.acciones {
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;
}

/* Sección hdr */
.sec-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 0.5px solid var(--bdr);
  font-size: 13px; font-weight: 500; color: var(--tx0);
}
.sec-hdr i { font-size: 16px; }
.sec-hdr.error   { background: var(--red-dim);  color: var(--red);  }
.sec-hdr.success { background: var(--grn-dim);  color: var(--grn);  }
.error-count {
  font-size: 11px; padding: 2px 8px; border-radius: 20px;
  background: var(--red); color: #fff; font-weight: 500;
}

/* Resultado stats */
.resultado-stats {
  display: flex; gap: 12px; padding: 16px; flex-wrap: wrap;
}
.rstat {
  flex: 1; min-width: 100px; display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 14px; border-radius: 10px; font-size: 12px;
}
.rstat.blue  { background: var(--acc-dim); color: var(--acc); }
.rstat.green { background: var(--grn-dim); color: var(--grn); }
.rstat.amber { background: var(--amb-dim); color: var(--amb); }
.rstat.red   { background: var(--red-dim); color: var(--red); }
.rstat-num   { font-size: 32px; font-weight: 700; line-height: 1; }

/* Tabla */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th {
  padding: 8px 14px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr);
}
td { padding: 9px 14px; font-size: 12.5px; border-bottom: 0.5px solid var(--bdr); color: var(--tx0); }
tbody tr:last-child td { border-bottom: none; }
.mono { font-family: monospace; }

/* Botones */
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.btn-sm:hover:not(:disabled) { background: var(--bg3); color: var(--tx0); }
.btn-sm:disabled { opacity: .4; cursor: not-allowed; }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .resultado-stats { flex-direction: column; }
  .acciones { justify-content: stretch; flex-direction: column; }
}

.input-clave {
  width: 100%; padding: 10px 14px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg2); color: var(--tx0);
  font-size: 14px; font-family: inherit; outline: none;
}
.input-clave:focus { border-color: var(--acc); }
.candado-sec { padding-bottom: 8px; }
</style>