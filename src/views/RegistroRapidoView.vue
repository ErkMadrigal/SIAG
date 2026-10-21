<template>
  <div class="rr">
    <div class="view-header">
      <div>
        <h1 class="view-title">Registro rápido de empleados</h1>
        <p class="view-sub">Solo superadministrador · pega los datos (texto o JSON), se detectan solos y se registran</p>
      </div>
    </div>

    <div class="card">
      <label class="lbl">Datos del empleado (uno o varios; separa cada empleado con una línea en blanco)</label>
      <textarea v-model="texto" rows="11" class="area" spellcheck="false"
        placeholder="José Luis Rodríguez&#10;Tipo de sangre: A(+)&#10;Escolaridad: primaria&#10;Alergias: ninguna&#10;Número de emergencia: 4433005059&#10;Parentesco: hija Lorena Rodríguez&#10;CLABE interbancaria: 012470015513857586&#10;Banco: Bancomer&#10;Número seguro social: 53785310850&#10;C.P: 58170&#10;CURP: ROXL561025HDFDXS02&#10;RFC: ROLU561025TK9&#10;Ingreso el 01 agosto del 2025"></textarea>

      <div class="defs">
        <div>
          <label class="lbl">Turno por defecto</label>
          <select v-model="defTurno" class="inp"><option value="">Seleccione</option><option v-for="o in cats.turno" :key="o.id" :value="o.id">{{ o.valor }}</option></select>
        </div>
        <div>
          <label class="lbl">Periodicidad por defecto</label>
          <select v-model="defPeriodicidad" class="inp"><option value="">Seleccione</option><option v-for="o in cats.periodicidad" :key="o.id" :value="o.id">{{ o.valor }}</option></select>
        </div>
        <div class="acts">
          <button class="btn main" :disabled="!texto.trim() || cargandoCats" @click="detectar"><i class="ti ti-wand"></i> Detectar datos</button>
          <button class="btn" @click="limpiar"><i class="ti ti-eraser"></i> Limpiar</button>
        </div>
      </div>
      <p v-if="aviso" class="aviso"><i class="ti ti-alert-triangle"></i> {{ aviso }}</p>
    </div>

    <div v-for="(r, i) in registros" :key="i" class="card reg" :class="{ ok: r._estado === 'ok', bad: r._estado === 'error' }">
      <div class="reg-hdr">
        <strong>{{ r.nombre }} {{ r.paterno }} {{ r.materno }}</strong>
        <span v-if="r._estado === 'ok'" class="tag ok"><i class="ti ti-circle-check"></i> Registrado · No. {{ r._numero }}</span>
        <span v-else-if="Object.keys(errores(r)).length" class="tag warn">{{ Object.keys(errores(r)).length }} por corregir</span>
        <span v-else class="tag ok">Listo para registrar</span>
      </div>
      <p v-if="r._msg" class="msg" :class="r._estado">{{ r._msg }}</p>

      <div class="grid">
        <div v-for="c in CAMPOS" :key="c.k" class="fld" :class="{ full: c.full }">
          <label class="lbl">{{ c.l }}</label>
          <select v-if="c.cat" v-model="r[c.k]" class="inp" :class="{ bad: errores(r)[c.k] }" :disabled="r._estado === 'ok'">
            <option value="">Seleccione</option>
            <option v-for="o in cats[c.cat]" :key="o.id" :value="o.id">{{ o.valor }}</option>
          </select>
          <input v-else v-model="r[c.k]" :type="c.t || 'text'" class="inp" :class="{ bad: errores(r)[c.k] }" :disabled="r._estado === 'ok'"
            @input="c.up && (r[c.k] = String(r[c.k]).toUpperCase())" />
          <span v-if="errores(r)[c.k]" class="err">{{ errores(r)[c.k] }}</span>
        </div>
      </div>
      <p v-if="r.bancoNombre || r._bancoReal" class="hint">
        Banco: <b>{{ r._bancoReal || '—' }}</b><template v-if="r.bancoNombre && r._bancoReal && !coincideBanco(r)"> · <span class="err">el texto decía "{{ r.bancoNombre }}"</span></template>
      </p>
      <p v-if="r._extras?.length" class="hint">No reconocido: {{ r._extras.join(' · ') }}</p>

      <div class="foot" v-if="r._estado !== 'ok'">
        <button class="btn" @click="registros.splice(i, 1)"><i class="ti ti-trash"></i> Quitar</button>
        <button class="btn main" :disabled="r._cargando" @click="registrar(r)"><i class="ti ti-user-plus"></i> {{ r._cargando ? 'Registrando...' : 'Registrar empleado' }}</button>
      </div>
    </div>

    <div v-if="registros.length > 1" class="card allbar">
      <span>{{ listos }} de {{ registros.length }} listos</span>
      <button class="btn main" :disabled="!listos || masivo" @click="registrarTodos"><i class="ti ti-users-plus"></i> {{ masivo ? 'Registrando...' : 'Registrar todos los válidos' }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { catalogosService } from '@/services/catalogos.service.js'
import api from '@/services/api.js'
import { detectarEmpleados, validarRegistro } from '@/composables/useParseEmpleado.js'

const ui = useUiStore()
const texto = ref('')
const registros = ref([])
const aviso = ref('')
const cargandoCats = ref(true)
const masivo = ref(false)
const defTurno = ref('')
const defPeriodicidad = ref('')
const cats = reactive({ turno: [], puesto: [], periodicidad: [], parentesco: [], escolaridad: [], tipoSangre: [] })

const CAMPOS = [
  { k: 'nombre', l: 'Nombre(s)', up: true }, { k: 'paterno', l: 'Apellido paterno', up: true }, { k: 'materno', l: 'Apellido materno', up: true },
  { k: 'curp', l: 'CURP', up: true }, { k: 'rfc', l: 'RFC', up: true }, { k: 'nss', l: 'NSS' }, { k: 'cp', l: 'C.P. fiscal' },
  { k: 'fecha_ingreso', l: 'Fecha de ingreso', t: 'date' },
  { k: 'interbancaria', l: 'CLABE interbancaria' },
  { k: 'tipoSangre', l: 'Tipo de sangre', cat: 'tipoSangre' }, { k: 'escolaridad', l: 'Escolaridad', cat: 'escolaridad' },
  { k: 'alergias', l: 'Alergias', up: true },
  { k: 'nombreEmergencia', l: 'Contacto de emergencia', up: true }, { k: 'parentesco', l: 'Parentesco', cat: 'parentesco' },
  { k: 'telefonoEmergencia', l: 'Teléfono de emergencia' },
  { k: 'turno', l: 'Turno', cat: 'turno' }, { k: 'puesto', l: 'Puesto', cat: 'puesto' }, { k: 'periodicidad', l: 'Periodicidad', cat: 'periodicidad' },
]

const errores = r => (r._estado === 'ok' ? {} : validarRegistro(r))
const listos = computed(() => registros.value.filter(r => r._estado !== 'ok' && !Object.keys(validarRegistro(r)).length).length)
const coincideBanco = r => r._bancoReal && r.bancoNombre && (r._bancoReal.toUpperCase().includes(r.bancoNombre) || r.bancoNombre.includes(r._bancoReal.toUpperCase().split(' ')[0]))

onMounted(async () => {
  ui.setBreadcrumbs([{ label: 'Home', to: '/' }, { label: 'Registro rápido', to: '/registro-rapido' }])
  try {
    const [turno, puesto, periodicidad, parentesco, escolaridad, tipoSangre] = await Promise.all(
      [7, 10, 9, 17, 1, 3].map(id => catalogosService.getCatalogo(id)))
    Object.assign(cats, { turno, puesto, periodicidad, parentesco, escolaridad, tipoSangre })
  } catch { aviso.value = 'No se pudieron cargar los catálogos' }
  finally { cargandoCats.value = false }
})

async function detectar() {
  aviso.value = ''
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())
  const lista = detectarEmpleados(texto.value, cats)
  if (!lista.length) { aviso.value = 'No se detectó ningún empleado en el texto'; registros.value = []; return }
  for (const r of lista) {
    if (!r.turno && defTurno.value) r.turno = defTurno.value
    if (!r.periodicidad && defPeriodicidad.value) r.periodicidad = defPeriodicidad.value
    if (!r.fecha_ingreso) r.fecha_ingreso = hoy
    r._estado = ''; r._msg = ''; r._cargando = false; r._bancoReal = ''; r.banco = ''
    // banco a partir de la CLABE
    if (r.interbancaria.length >= 3) {
      try {
        const b = await catalogosService.getInstitucionBancaria(r.interbancaria.slice(0, 3))
        if (b) { r.banco = b.id || ''; r._bancoReal = b.valor || '' }
      } catch {}
    }
  }
  registros.value = lista
}

function limpiar() { texto.value = ''; registros.value = []; aviso.value = '' }

async function registrar(r) {
  const errs = validarRegistro(r)
  if (Object.keys(errs).length) { r._estado = 'error'; r._msg = 'Corrige: ' + Object.values(errs).join(' · '); return false }
  r._cargando = true; r._msg = ''
  try {
    const fd = new FormData()
    fd.append('action', 'empleados')
    const f = {
      nombre: r.nombre, paterno: r.paterno, materno: r.materno, curp: r.curp, rfc: r.rfc, nss: r.nss, cp: r.cp,
      alergias: r.alergias, escolaridad: r.escolaridad, tipoSangre: r.tipoSangre,
      nombreEmergencia: r.nombreEmergencia, telefonoEmergencia: r.telefonoEmergencia, parentesco: r.parentesco,
      turno: r.turno, puesto: r.puesto, periodicidad: r.periodicidad,
      fecha_ingreso: r.fecha_ingreso, fecha_efectiva: r.fecha_ingreso,
      interbancaria: r.interbancaria, institucionBancaria: r.banco || '', banco: r.banco || '',
      modo_sueldo: r.modo_sueldo, salario_mensual: r.salario_mensual,
    }
    Object.entries(f).forEach(([k, v]) => fd.append(k, v ?? ''))
    const { data: res } = await api.post('/empleados', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    r._estado = 'ok'
    r._numero = String(res?.last_insert_id ?? '').padStart(6, '0')
    r._msg = ''
    return true
  } catch (err) {
    const d = err.response?.data || {}
    r._estado = 'error'
    r._msg = d.errors && typeof d.errors === 'object'
      ? Object.entries(d.errors).map(([k, m]) => `${k}: ${m}`).join(' · ')
      : (d.message || d.mensaje || 'No se pudo registrar')
    return false
  } finally { r._cargando = false }
}

async function registrarTodos() {
  masivo.value = true
  for (const r of registros.value) {
    if (r._estado === 'ok' || Object.keys(validarRegistro(r)).length) continue
    await registrar(r)
  }
  masivo.value = false
}
</script>

<style scoped>
.rr { display: flex; flex-direction: column; gap: 14px; }
.view-title { margin: 0; font-size: 20px; color: var(--tx0); }
.view-sub { margin: 2px 0 0; font-size: 12px; color: var(--tx2); }
.card { background: var(--bg1); border: 0.5px solid var(--bdr2); border-radius: 14px; padding: 16px; }
.card.ok { border-color: rgba(34,201,122,.5); } .card.bad { border-color: rgba(240,84,84,.5); }
.lbl { display: block; font-size: 12px; color: var(--tx2); margin: 0 0 4px; }
.area { width: 100%; box-sizing: border-box; background: var(--bg2); border: 0.5px solid var(--bdr2); color: var(--tx0); border-radius: 10px; padding: 12px; font-family: ui-monospace, monospace; font-size: 13px; resize: vertical; }
.inp { width: 100%; box-sizing: border-box; background: var(--bg2); border: 0.5px solid var(--bdr2); color: var(--tx0); border-radius: 9px; padding: 9px 10px; font-family: inherit; font-size: 13px; }
.inp.bad { border-color: #f05454; }
.defs { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; align-items: end; margin-top: 12px; }
.acts { display: flex; gap: 8px; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 9px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; background: var(--bg2); color: var(--tx0); border: 0.5px solid var(--bdr2); }
.btn.main { background: var(--acc, #4f8ef7); border-color: var(--acc, #4f8ef7); color: #fff; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.aviso { color: #f5a623; font-size: 12px; margin: 10px 0 0; }
.reg-hdr { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; color: var(--tx0); }
.tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
.tag.ok { background: rgba(34,201,122,.14); color: #22c97a; } .tag.warn { background: rgba(245,166,35,.14); color: #f5a623; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.err { color: #f05454; font-size: 11px; } .hint { color: var(--tx2); font-size: 12px; margin: 8px 0 0; }
.msg { font-size: 12px; margin: 0 0 8px; } .msg.error { color: #f05454; }
.foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.allbar { display: flex; align-items: center; justify-content: space-between; color: var(--tx0); }
</style>
