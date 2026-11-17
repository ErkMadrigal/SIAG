<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { lectorBiometricoService as svc } from '@/services/lectorBiometrico.service'

const router = useRouter()
const archivo = ref(null)
const arrastrando = ref(false)
const subiendo = ref(false)
const error = ref('')
const res = ref(null)
const tot = ref(null)
const lotes = ref([])

async function cargar() {
  try { const r = await svc.resumen(); tot.value = r.totales; lotes.value = r.lotes || [] } catch { /* sin migración */ }
}
function elegir(f) { if (f) { archivo.value = f; res.value = null; error.value = '' } }
function soltar(e) { arrastrando.value = false; elegir(e.dataTransfer.files?.[0]) }
async function importar() {
  if (!archivo.value) return
  subiendo.value = true; error.value = ''; res.value = null
  try { res.value = await svc.importar(archivo.value); archivo.value = null; cargar() }
  catch (e) { error.value = e?.response?.data?.message || e?.response?.data?.error || 'No se pudo importar el archivo' }
  finally { subiendo.value = false }
}
const fmt = n => Number(n || 0).toLocaleString('es-MX')
onMounted(cargar)
</script>

<template>
  <div class="lb">
    <h1>Lector biométrico</h1>
    <p class="sub">Sube el CSV del lector. Solo se registran los empleados que ya tienen su <b>ID biométrico</b> asignado (en la ficha del empleado). Los números que no estén asignados se ignoran.</p>

    <div class="drop" :class="{ on: arrastrando }" @dragover.prevent="arrastrando = true" @dragleave="arrastrando = false" @drop.prevent="soltar">
      <input id="lbf" type="file" accept=".csv,.txt" hidden @change="elegir($event.target.files[0])" />
      <label for="lbf" class="lnk">{{ archivo ? archivo.name : 'Elegir archivo CSV o arrastrarlo aquí' }}</label>
      <button class="btn" :disabled="!archivo || subiendo" @click="importar">{{ subiendo ? 'Importando…' : 'Importar' }}</button>
    </div>
    <p v-if="error" class="err">{{ error }}</p>

    <div v-if="res" class="card">
      <h3>Resultado</h3>
      <p class="big">{{ fmt(res.empleados) }} empleado(s) encontrados · {{ fmt(res.registradas) }} movimientos registrados</p>
      <p class="mut">Periodo {{ res.desde }} a {{ res.hasta }}<span v-if="res.repetidas"> · {{ fmt(res.repetidas) }} ya estaban registrados</span><span v-if="res.invalidas"> · {{ fmt(res.invalidas) }} filas inválidas</span></p>
      <p v-if="!res.empleados" class="warn">Ningún número del archivo está asignado a un empleado. Asigna el ID biométrico en la ficha de cada empleado y vuelve a importar.</p>
      <button class="btn sec" @click="router.push('/registros')">Ver en Registros</button>
      <details v-if="res.sin_asignar">
        <summary>{{ fmt(res.sin_asignar) }} número(s) del archivo sin empleado asignado (ignorados, {{ fmt(res.sin_asignar_filas) }} marcaciones)</summary>
        <table><thead><tr><th>ID lector</th><th>Nombre en el lector</th><th>Marcaciones</th></tr></thead>
          <tbody><tr v-for="s in res.sin_asignar_lista" :key="s.id_biometrico"><td>{{ s.id_biometrico }}</td><td>{{ s.nombre }}</td><td>{{ s.marcaciones }}</td></tr></tbody></table>
      </details>
    </div>

    <div v-if="tot" class="card">
      <h3>Lo que hay guardado</h3>
      <p>{{ fmt(tot.marcaciones) }} movimientos · {{ fmt(tot.empleados) }} empleados · {{ tot.desde || '—' }} a {{ tot.hasta || '—' }} · {{ fmt(tot.con_id_asignado) }} empleados con ID asignado</p>
      <table v-if="lotes.length"><thead><tr><th>Archivo</th><th>Nuevos</th><th>Repetidos</th><th>Periodo</th><th>Cargado</th></tr></thead>
        <tbody><tr v-for="l in lotes" :key="l.id"><td>{{ l.archivo }}</td><td>{{ l.nuevas }}</td><td>{{ l.duplicadas }}</td><td>{{ l.desde }} a {{ l.hasta }}</td><td>{{ l.created_at }}</td></tr></tbody></table>
    </div>
  </div>
</template>

<style scoped>
.lb{padding:20px;max-width:900px}
h1{margin:0 0 4px;font-size:22px}.sub{color:#64748b;margin:0 0 16px}
.drop{display:flex;gap:12px;align-items:center;justify-content:space-between;border:2px dashed #cbd5e1;border-radius:12px;padding:22px;background:#f8fafc}
.drop.on{border-color:#2563eb;background:#eff6ff}
.lnk{cursor:pointer;color:#2563eb;font-weight:600}
.btn{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-weight:600;cursor:pointer}
.btn:disabled{opacity:.5;cursor:default}.btn.sec{background:#0f172a;margin-top:8px}
.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:16px;background:#fff}
.card h3{margin:0 0 8px;font-size:15px}.big{font-size:17px;font-weight:700;margin:0}.mut{color:#64748b;margin:4px 0}
.err{color:#dc2626}.warn{color:#b45309;background:#fffbeb;padding:8px;border-radius:8px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #f1f5f9}
details{margin-top:12px}summary{cursor:pointer;color:#475569}
</style>
