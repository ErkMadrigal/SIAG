<script>
// Drop-in para <select>: se escribe igual (<SearchSelect v-model="x"><option .../></SearchSelect>)
// pero con búsqueda y opciones ordenadas alfabéticamente.
export default { inheritAttrs: false }
</script>

<script setup>
import { ref, computed, useSlots, useAttrs, nextTick, onBeforeUnmount, Fragment, Text, Comment } from 'vue'

const props = defineProps({
  modelValue: { default: '' },
  disabled:   { type: Boolean, default: false },
  // Para listas cuyo orden importa (prioridades, flujos, etc.)
  sinOrden:   { type: Boolean, default: false },
  placeholder:{ type: String, default: '' },
  // Mostrar buscador desde N opciones
  minBusqueda:{ type: Number, default: 6 },
})
const emit = defineEmits(['update:modelValue', 'change'])
const slots = useSlots()
const attrs = useAttrs()

const abierto = ref(false)
const busqueda = ref('')
const activo = ref(-1)
const triggerRef = ref(null)
const panelRef = ref(null)
const inputRef = ref(null)
const listRef = ref(null)
const pos = ref({ top: 0, left: 0, width: 200, arriba: false, maxH: 280 })

function textoDe(children) {
  if (children == null) return ''
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(textoDe).join('')
  if (children.type === Text) return String(children.children ?? '')
  if (children.children) return textoDe(children.children)
  return ''
}

function aplanar(nodes, out) {
  for (const n of nodes || []) {
    if (!n) continue
    if (Array.isArray(n)) { aplanar(n, out); continue }
    if (n.type === Fragment) { aplanar(n.children, out); continue }
    if (n.type === Comment) continue
    if (n.type === 'option') {
      const p = n.props || {}
      const label = textoDe(n.children).trim()
      const hasValue = 'value' in p
      out.push({
        value: hasValue ? p.value : label,
        label,
        disabled: p.disabled === '' || p.disabled === true,
      })
    } else if (n.type === 'optgroup') {
      aplanar(n.children, out)
    }
  }
  return out
}

const esVacio = v => v === '' || v === null || v === undefined || v === 0 || v === '0'

const opciones = computed(() => {
  const todas = aplanar(slots.default ? slots.default() : [], [])
  if (props.sinOrden) return todas
  // Si todas son numéricas (10/25/50, años...) se respeta el orden original
  const numerica = todas.length > 0 && todas.every(o => o.label !== '' && !isNaN(Number(o.label.replace(/,/g, ''))))
  if (numerica) return todas
  // La opción "vacía" (Seleccione / Todos / —) siempre va primero
  const primeras = []
  const resto = []
  todas.forEach((o, i) => {
    if (i === 0 && (esVacio(o.value) || /^(—|-|–|seleccion|todos|todas|ninguno|ninguna|sin )/i.test(o.label))) primeras.push(o)
    else resto.push(o)
  })
  resto.sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true, sensitivity: 'base' }))
  return [...primeras, ...resto]
})

const mostrarBuscador = computed(() => opciones.value.length >= props.minBusqueda)

const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filtradas = computed(() => {
  const q = norm(busqueda.value.trim())
  if (!q) return opciones.value
  return opciones.value.filter(o => norm(o.label).includes(q))
})

const seleccionada = computed(() => {
  const mv = props.modelValue
  return opciones.value.find(o => o.value === mv)
    ?? opciones.value.find(o => String(o.value) === String(mv ?? ''))
})

const textoTrigger = computed(() => seleccionada.value?.label ?? '')
const esPlaceholder = computed(() => !seleccionada.value || (esVacio(seleccionada.value.value) && !!seleccionada.value.label && /^(—|-|–|selecci|todos|todas|ninguno|ninguna)/i.test(seleccionada.value.label)))

function esSel(o) {
  return seleccionada.value === o
}

function calcularPos() {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight
  const abajo = vh - r.bottom - 12
  const arriba = r.top - 12
  const deseado = 320
  const usarArriba = abajo < 200 && arriba > abajo
  const maxH = Math.max(140, Math.min(deseado, usarArriba ? arriba : abajo))
  const ancho = Math.max(r.width, 180)
  let left = r.left
  if (left + ancho > window.innerWidth - 8) left = Math.max(8, window.innerWidth - ancho - 8)
  pos.value = {
    top: usarArriba ? r.top - 4 : r.bottom + 4,
    left, width: ancho, arriba: usarArriba, maxH,
  }
}

async function abrir() {
  if (props.disabled || abierto.value) return
  busqueda.value = ''
  calcularPos()
  abierto.value = true
  activo.value = Math.max(0, filtradas.value.findIndex(esSel))
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', cerrar)
  document.addEventListener('mousedown', onFuera, true)
  await nextTick()
  if (mostrarBuscador.value) inputRef.value?.focus()
  else panelRef.value?.focus()
  scrollActivo()
}

function cerrar() {
  if (!abierto.value) return
  abierto.value = false
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', cerrar)
  document.removeEventListener('mousedown', onFuera, true)
}

function onScroll(e) {
  if (panelRef.value && panelRef.value.contains(e.target)) return
  cerrar()
}
function onFuera(e) {
  if (panelRef.value?.contains(e.target) || triggerRef.value?.contains(e.target)) return
  cerrar()
}

function elegir(o) {
  if (!o || o.disabled) return
  emit('update:modelValue', o.value)
  emit('change', o.value)
  cerrar()
  triggerRef.value?.focus()
}

function scrollActivo() {
  nextTick(() => {
    const li = listRef.value?.children?.[activo.value]
    li?.scrollIntoView?.({ block: 'nearest' })
  })
}

function onKey(e) {
  if (!abierto.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir() }
    return
  }
  const n = filtradas.value.length
  if (e.key === 'ArrowDown') { e.preventDefault(); activo.value = n ? (activo.value + 1) % n : -1; scrollActivo() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activo.value = n ? (activo.value - 1 + n) % n : -1; scrollActivo() }
  else if (e.key === 'Enter') { e.preventDefault(); elegir(filtradas.value[activo.value]) }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); triggerRef.value?.focus() }
  else if (e.key === 'Tab') cerrar()
}

function onBuscar() { activo.value = filtradas.value.length ? 0 : -1 }

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', cerrar)
  document.removeEventListener('mousedown', onFuera, true)
})
</script>

<template>
  <div class="ss-root" :class="[attrs.class, { 'ss-open': abierto, 'ss-disabled': disabled }]" :style="attrs.style">
    <button
      ref="triggerRef"
      type="button"
      class="ss-trigger"
      :disabled="disabled"
      :title="textoTrigger"
      @click="abierto ? cerrar() : abrir()"
      @keydown="onKey"
    >
      <span class="ss-text" :class="{ 'ss-ph': esPlaceholder }">{{ textoTrigger || placeholder || ' ' }}</span>
      <svg class="ss-caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>

    <Teleport to="body">
      <div
        v-if="abierto"
        ref="panelRef"
        class="ss-panel"
        tabindex="-1"
        :style="{
          left: pos.left + 'px', width: pos.width + 'px',
          top: pos.top + 'px',
          transform: pos.arriba ? 'translateY(-100%)' : 'none',
          maxHeight: pos.maxH + 'px',
        }"
        @keydown="onKey"
      >
        <div v-if="mostrarBuscador" class="ss-search">
          <input
            ref="inputRef"
            v-model="busqueda"
            type="text"
            class="ss-input"
            placeholder="Buscar..."
            autocomplete="off"
            spellcheck="false"
            @input="onBuscar"
            @keydown="onKey"
          />
        </div>
        <ul ref="listRef" class="ss-list" role="listbox">
          <li
            v-for="(o, i) in filtradas"
            :key="i"
            class="ss-opt"
            :class="{ 'ss-sel': esSel(o), 'ss-act': i === activo, 'ss-dis': o.disabled }"
            role="option"
            @mousemove="activo = i"
            @click="elegir(o)"
          >{{ o.label || ' ' }}</li>
          <li v-if="!filtradas.length" class="ss-empty">Sin resultados</li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style>
.ss-root { position: relative; display: inline-block; min-width: 0; max-width: 100%; vertical-align: middle; }
.ss-trigger {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; min-width: 0; text-align: left; cursor: pointer;
  background: var(--bg2, #1e2535); border: 0.5px solid var(--bdr2, rgba(255,255,255,.12));
  border-radius: 8px; padding: 8px 12px; font-size: 13px; color: var(--tx0, #f1f3f9);
  font-family: inherit; outline: none; transition: border-color .15s, box-shadow .15s; line-height: inherit;
}
.ss-trigger:hover:not(:disabled) { border-color: var(--tx3, #5b6274); }
.ss-trigger:focus-visible, .ss-open .ss-trigger { border-color: var(--acc, #4f8ef7); }
.ss-trigger:disabled { opacity: .55; cursor: not-allowed; }
.ss-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ss-ph { color: var(--tx2, #8a92a6); }
.ss-caret { flex-shrink: 0; color: var(--tx2, #8a92a6); transition: transform .15s; }
.ss-open .ss-caret { transform: rotate(180deg); }
/* heredar estados de error de los formularios */
.ss-root.error .ss-trigger, .ss-root.input-error .ss-trigger { border-color: var(--red, #f05454); }

.ss-panel {
  position: fixed; z-index: 100000; display: flex; flex-direction: column; overflow: hidden;
  background: var(--bg1, var(--bg2, #1e2535)); border: 0.5px solid var(--bdr2, rgba(255,255,255,.18));
  border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.35); outline: none; color: var(--tx0, #f1f3f9);
}
.ss-search { padding: 8px; border-bottom: 0.5px solid var(--bdr2, rgba(255,255,255,.12)); }
.ss-input {
  width: 100%; box-sizing: border-box; background: var(--bg2, #1e2535); color: var(--tx0, #f1f3f9);
  border: 0.5px solid var(--bdr2, rgba(255,255,255,.12)); border-radius: 8px; padding: 7px 10px;
  font-size: 13px; font-family: inherit; outline: none;
}
.ss-input:focus { border-color: var(--acc, #4f8ef7); }
.ss-list { list-style: none; margin: 0; padding: 4px; overflow-y: auto; flex: 1; }
.ss-opt { padding: 7px 10px; border-radius: 6px; font-size: 13px; cursor: pointer; white-space: normal; word-break: break-word; }
.ss-opt.ss-act { background: var(--acc-dim, rgba(79,142,247,.16)); }
.ss-opt.ss-sel { color: var(--acc, #4f8ef7); font-weight: 600; }
.ss-opt.ss-dis { opacity: .4; cursor: not-allowed; }
.ss-empty { padding: 10px; font-size: 12px; text-align: center; color: var(--tx2, #8a92a6); }
</style>
