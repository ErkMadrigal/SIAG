<template>
  <div class="foto-input">
    <label v-if="!preview" class="drop" :class="{ over }" @dragover.prevent="over = true"
           @dragleave.prevent="over = false" @drop.prevent="onDrop">
      <i class="ti ti-camera-plus"></i>
      <span class="t1">{{ texto }}</span>
      <span class="t2">Haz clic o arrastra una imagen · JPG o PNG, máx 5 MB</span>
      <input type="file" accept="image/jpeg,image/png" hidden @change="onChange" />
    </label>

    <div v-else class="prev">
      <img :src="preview" alt="Vista previa" />
      <div class="info">
        <span class="nombre" :title="nombre">{{ nombre }}</span>
        <div class="acts">
          <label class="btn-mini">
            <i class="ti ti-refresh"></i> Cambiar
            <input type="file" accept="image/jpeg,image/png" hidden @change="onChange" />
          </label>
          <button type="button" class="btn-mini danger" @click="quitar"><i class="ti ti-trash"></i> Quitar</button>
        </div>
      </div>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: [File, null], default: null },
  texto: { type: String, default: 'Subir foto' },
})
const emit = defineEmits(['update:modelValue'])

const preview = ref('')
const nombre  = ref('')
const over    = ref(false)
const error   = ref('')

function liberar() {
  if (preview.value) URL.revokeObjectURL(preview.value)
}

function asignar(file) {
  error.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png'].includes(file.type)) { error.value = 'Solo JPG o PNG'; return }
  if (file.size > 5 * 1024 * 1024) { error.value = 'La imagen pesa más de 5 MB'; return }
  liberar()
  preview.value = URL.createObjectURL(file)
  nombre.value  = file.name
  emit('update:modelValue', file)
}

function onChange(e) { asignar(e.target.files?.[0]); e.target.value = '' }
function onDrop(e)   { over.value = false; asignar(e.dataTransfer?.files?.[0]) }
function quitar()    { liberar(); preview.value = ''; nombre.value = ''; emit('update:modelValue', null) }

// Si el padre limpia el valor (al abrir otro modal), se limpia la vista previa
watch(() => props.modelValue, v => { if (!v && preview.value) { liberar(); preview.value = ''; nombre.value = '' } })
onBeforeUnmount(liberar)
</script>

<style scoped>
.drop {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  padding: 18px 12px; border-radius: 12px; cursor: pointer; text-align: center;
  background: var(--bg2); border: 1.5px dashed var(--bdr2); transition: all .15s;
}
.drop:hover, .drop.over { border-color: var(--acc); background: var(--acc-dim); }
.drop i { font-size: 28px; color: var(--acc); }
.t1 { font-size: 13px; font-weight: 600; color: var(--tx0); }
.t2 { font-size: 11px; color: var(--tx3); }
.prev { display: flex; gap: 12px; align-items: center; padding: 10px; border-radius: 12px;
  background: var(--bg2); border: 0.5px solid var(--bdr2); }
.prev img { width: 96px; height: 72px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.nombre { font-size: 12px; color: var(--tx1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acts { display: flex; gap: 6px; }
.btn-mini { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 8px; cursor: pointer;
  border: 0.5px solid var(--bdr2); background: transparent; color: var(--tx1); font-size: 11px; font-family: inherit; }
.btn-mini:hover { background: var(--bg3); color: var(--tx0); }
.btn-mini.danger { color: var(--red); }
.err { color: var(--red); font-size: 11px; margin-top: 6px; }
</style>
