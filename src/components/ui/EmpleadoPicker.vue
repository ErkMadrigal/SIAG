<template>
  <div class="ep">
    <div v-if="seleccionado" class="ep-sel">
      <div>
        <strong>No. {{ String(seleccionado.id).padStart(6, '0') }}</strong>
        <span>{{ seleccionado.nombre }}</span>
        <small v-if="seleccionado.curp">{{ seleccionado.curp }}</small>
      </div>
      <button type="button" class="ep-x" title="Quitar" @click="quitar"><i class="ti ti-x"></i></button>
    </div>
    <template v-else>
      <div class="ep-box">
        <i class="ti ti-search"></i>
        <input v-model="q" placeholder="Número de empleado, nombre, CURP o RFC..." @input="buscar" autocomplete="off" />
      </div>
      <div v-if="q.trim().length >= 2" class="ep-list">
        <div v-if="cargando" class="ep-item muted">Buscando...</div>
        <div v-else-if="!resultados.length" class="ep-item muted">Sin resultados</div>
        <button v-for="r in resultados" :key="r.id" type="button" class="ep-item" :disabled="!!r.vinculado_a" @click="elegir(r)">
          <span><b>{{ String(r.id).padStart(6, '0') }}</b> · {{ r.nombre }}</span>
          <small v-if="r.vinculado_a" class="ep-warn">ya vinculado a {{ r.vinculado_a }}</small>
          <small v-else>{{ r.curp }}</small>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { usuariosService } from '@/services/usuarios.service.js'

const props = defineProps({ modelValue: { type: [Number, String, null], default: null }, inicial: { type: Object, default: null } })
const emit  = defineEmits(['update:modelValue', 'elegido'])

const q = ref('')
const resultados = ref([])
const cargando = ref(false)
const seleccionado = ref(props.inicial)
let timer = null

watch(() => props.modelValue, v => { if (!v) seleccionado.value = null })

function buscar() {
  clearTimeout(timer)
  if (q.value.trim().length < 2) { resultados.value = []; return }
  timer = setTimeout(async () => {
    cargando.value = true
    try { resultados.value = await usuariosService.buscarEmpleado(q.value.trim()) }
    catch { resultados.value = [] }
    finally { cargando.value = false }
  }, 300)
}
function elegir(r) {
  seleccionado.value = r; q.value = ''; resultados.value = []
  emit('update:modelValue', r.id); emit('elegido', r)
}
function quitar() { seleccionado.value = null; emit('update:modelValue', null); emit('elegido', null) }
</script>

<style scoped>
.ep { width: 100%; }
.ep-box { display: flex; align-items: center; gap: 8px; background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 9px; padding: 0 10px; }
.ep-box input { flex: 1; background: transparent; border: none; outline: none; color: var(--tx0); padding: 10px 0; font-family: inherit; font-size: 13px; }
.ep-list { margin-top: 6px; border: 0.5px solid var(--bdr2); border-radius: 9px; background: var(--bg1); max-height: 220px; overflow: auto; }
.ep-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; text-align: left; padding: 9px 12px; background: none; border: none; border-bottom: 0.5px solid var(--bdr2); color: var(--tx0); font-size: 13px; cursor: pointer; font-family: inherit; }
.ep-item:hover:not(:disabled) { background: var(--bg2); }
.ep-item:disabled { opacity: .55; cursor: not-allowed; }
.ep-item.muted { color: var(--tx2); cursor: default; }
.ep-item small { color: var(--tx2); font-size: 11px; } .ep-warn { color: #f5a623 !important; }
.ep-sel { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 0.5px solid rgba(34,201,122,.5); background: rgba(34,201,122,.08); border-radius: 9px; font-size: 13px; color: var(--tx0); }
.ep-sel div { display: flex; flex-direction: column; } .ep-sel small { color: var(--tx2); font-size: 11px; }
.ep-x { background: none; border: none; color: var(--tx2); cursor: pointer; font-size: 16px; }
</style>
