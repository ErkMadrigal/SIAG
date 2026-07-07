<template>
  <div class="dispersion-modal">
    <h3>Generar dispersión — {{ nomina?.nombre }}</h3>

    <div v-if="nomina?.estatus !== 'aprobada'" class="aviso-warning">
      ⚠️ La nómina debe estar <strong>aprobada</strong> para generar la dispersión.
      Estatus actual: <strong>{{ nomina?.estatus }}</strong>
    </div>

    <div v-else>
      <label class="label-formato">Formato bancario:</label>
      <div class="opciones-formato">
        <label v-for="opt in formatos" :key="opt.value" class="opcion-radio">
          <input type="radio" v-model="formatoSeleccionado" :value="opt.value" />
          {{ opt.label }}
        </label>
      </div>

      <button
        class="btn-descargar"
        :disabled="descargando"
        @click="descargarDispersion"
      >
        {{ descargando ? 'Generando...' : '⬇ Descargar dispersión' }}
      </button>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/services/api.js'

const props = defineProps({
  nomina: { type: Object, required: true }, // { id, nombre, estatus, ... }
})

const formatos = [
  { value: 'generico', label: 'Genérico (CSV)' },
  { value: 'bbva',     label: 'BBVA' },
  { value: 'banamex',  label: 'Banamex' },
  { value: 'spei',     label: 'SPEI genérico' },
]

const formatoSeleccionado = ref('generico')
const descargando = ref(false)
const error = ref(null)



async function descargarDispersion() {
  descargando.value = true
  error.value = null

  try {
    const response = await api.get(
        `/nomina-fatiga/${props.nomina.id}/dispersion`,
        { params: { formato: formatoSeleccionado.value }, responseType: 'blob' }
    )

    // Extraer el nombre del archivo del header Content-Disposition
    const disposition = response.headers['content-disposition'] || ''
    const match = disposition.match(/filename="(.+)"/)
    const nombreArchivo = match ? match[1] : `dispersion_nomina_${props.nomina.id}.csv`

    // Forzar la descarga en el navegador
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', nombreArchivo)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

  } catch (e) {
    // Si el backend respondió con error, viene como blob JSON — hay que parsearlo
    if (e.response?.data instanceof Blob) {
      const texto = await e.response.data.text()
      try {
        const json = JSON.parse(texto)
        error.value = json.message || 'Error generando la dispersión'
      } catch {
        error.value = 'Error generando la dispersión'
      }
    } else {
      error.value = e.response?.data?.message || 'Error generando la dispersión'
    }
  } finally {
    descargando.value = false
  }
}
</script>

<style scoped>
.dispersion-modal {
  padding: 1.5rem;
  max-width: 420px;
}
.aviso-warning {
  background: #3a2a10;
  color: #ffb74d;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}
.label-formato {
  display: block;
  margin: 1rem 0 0.5rem;
  font-weight: 600;
}
.opciones-formato {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.opcion-radio {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.btn-descargar {
  width: 100%;
  padding: 0.65rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.btn-descargar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error-msg {
  color: #ef4444;
  margin-top: 0.75rem;
  font-size: 0.85rem;
}
</style>