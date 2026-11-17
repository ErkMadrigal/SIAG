<script setup>
import { ref, computed } from 'vue'
import { lectorBiometricoService as svc } from '@/services/lectorBiometrico.service'

const hoy = new Date().toISOString().slice(0, 10)
const hace7 = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)
const desde = ref(hace7)
const hasta = ref(hoy)
const q = ref('')
const modo = ref('resumen') // resumen = primera y última del día | detalle = todos los movimientos
const filas = ref([])
const cargando = ref(false)
const error = ref('')
const truncado = ref(false)
const consultado = ref(false)

async function consultar() {
  cargando.value = true; error.value = ''
  try {
    const r = await svc.registros({ desde: desde.value, hasta: hasta.value, q: q.value, modo: modo.value })
    filas.value = r.data || []; truncado.value = !!r.truncado; consultado.value = true
  } catch (e) {
    filas.value = []
    error.value = e?.response?.data?.message || e?.response?.data?.error || 'No se pudo consultar'
  } finally { cargando.value = false }
}
function cambiarModo(m) { modo.value = m; consultar() }

const cols = computed(() => modo.value === 'resumen'
  ? [['Fecha', 'fecha'], ['No. empleado', 'numero'], ['Empleado', 'empleado'], ['Ubicación', 'ubicacion'], ['ID lector', 'id_biometrico'], ['Primera entrada', 'primera'], ['Última salida', 'ultima'], ['Marcaciones', 'marcaciones']]
  : [['Fecha', 'fecha'], ['Hora', 'hora'], ['No. empleado', 'numero'], ['Empleado', 'empleado'], ['Ubicación', 'ubicacion'], ['ID lector', 'id_biometrico']])

// Si solo hubo una marcación en el día, no hay "última salida" real
const celda = (f, k) => (modo.value === 'resumen' && k === 'ultima' && Number(f.marcaciones) < 2) ? '—' : (f[k] ?? '')

async function exportar() {
  const XLSX = await import('xlsx')
  const datos = filas.value.map(f => Object.fromEntries(cols.value.map(([t, k]) => [t, celda(f, k)])))
  const ws = XLSX.utils.json_to_sheet(datos)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, modo.value === 'resumen' ? 'Primera y última' : 'Movimientos')
  XLSX.writeFile(wb, `lector_${modo.value === 'resumen' ? 'primera_ultima' : 'movimientos'}_${desde.value}_${hasta.value}.xlsx`)
}
</script>

<template>
  <div class="lr">
    <div class="barra">
      <label>Desde <input type="date" v-model="desde" /></label>
      <label>Hasta <input type="date" v-model="hasta" /></label>
      <input class="q" v-model="q" placeholder="Buscar empleado, número o ID lector" @keydown.enter="consultar" />
      <button class="b" @click="consultar" :disabled="cargando">{{ cargando ? 'Consultando…' : 'Consultar' }}</button>
      <button class="b sec" @click="exportar" :disabled="!filas.length">Exportar Excel</button>
    </div>
    <div class="modos">
      <button :class="{ on: modo === 'resumen' }" @click="cambiarModo('resumen')">Primera entrada y última salida del día</button>
      <button :class="{ on: modo === 'detalle' }" @click="cambiarModo('detalle')">Todos los movimientos</button>
    </div>
    <p v-if="error" class="err">{{ error }}</p>
    <p v-if="truncado" class="warn">Hay más de 20,000 filas; se muestran las primeras. Acota el rango de fechas.</p>
    <p v-if="consultado && !filas.length && !error" class="mut">Sin movimientos del lector en ese rango (solo aparecen empleados con ID biométrico asignado e importados).</p>
    <div v-if="filas.length" class="wrap">
      <p class="mut">{{ filas.length.toLocaleString('es-MX') }} fila(s)</p>
      <table>
        <thead><tr><th v-for="c in cols" :key="c[1]">{{ c[0] }}</th></tr></thead>
        <tbody><tr v-for="(f, i) in filas" :key="i"><td v-for="c in cols" :key="c[1]">{{ celda(f, c[1]) }}</td></tr></tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.barra{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:12px}
.barra label{display:flex;flex-direction:column;font-size:12px;color:#64748b;gap:2px}
.barra input{padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px}.q{min-width:240px;flex:1}
.b{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:600;cursor:pointer}
.b.sec{background:#0f172a}.b:disabled{opacity:.5;cursor:default}
.modos{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.modos button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:7px 14px;cursor:pointer}
.modos button.on{background:#2563eb;color:#fff;border-color:#2563eb}
.wrap{overflow:auto;max-height:65vh}
table{width:100%;border-collapse:collapse;font-size:13px}
th{position:sticky;top:0;background:#f1f5f9;text-align:left;padding:8px}td{padding:6px 8px;border-bottom:1px solid #f1f5f9}
.mut{color:#64748b}.err{color:#dc2626}.warn{color:#b45309}
</style>
