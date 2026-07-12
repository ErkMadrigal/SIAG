<template>
  <div class="buscador-view">
    <div class="buscador-card">
      <div class="buscador-header">
        <div class="buscador-icon"><i class="ti ti-search" aria-hidden="true"></i></div>
        <h1 class="buscador-title">Buscar empleado</h1>
        <p class="buscador-sub">Busca por nombre, CURP, RFC o NSS</p>
      </div>

      <form class="buscador-form" @submit.prevent="buscar">
        <input
          v-model="q"
          type="text"
          placeholder="Nombre, CURP, RFC o NSS"
          class="buscador-input"
          autofocus
        />
        <button type="submit" class="buscador-btn" :disabled="buscando">
          <i class="ti ti-loader-2 spin" v-if="buscando" aria-hidden="true"></i>
          <i class="ti ti-search" v-else aria-hidden="true"></i>
          {{ buscando ? 'Buscando...' : 'Buscar' }}
        </button>
      </form>

      <p v-if="error" class="buscador-error">{{ error }}</p>
    </div>

    <!-- Resultados -->
    <div v-if="resultados.length" class="resultados-wrap">
      <p class="resultados-count">{{ resultados.length }} resultado{{ resultados.length === 1 ? '' : 's' }}</p>
      <div class="resultados-grid">
        <div v-for="r in resultados" :key="r.no_empleado" class="resultado-card-simple">
          <span class="resultado-nombre">{{ r.nombreCompleto }}</span>
          <span class="resultado-label">No. de Empleado</span>
          <span class="resultado-no-grande">{{ r.no_empleado }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="buscoAlMenosUnaVez && !buscando" class="sin-resultados">
      <i class="ti ti-user-off" aria-hidden="true"></i>
      <p>No se encontraron empleados con ese criterio</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/services/api.js'

const q = ref('')

const buscando = ref(false)
const error    = ref('')
const resultados = ref([])
const buscoAlMenosUnaVez = ref(false)

async function buscar() {
  error.value = ''

  if (!q.value.trim()) {
    error.value = 'Escribe un nombre, CURP, RFC o NSS para buscar'
    return
  }

  buscando.value = true
  buscoAlMenosUnaVez.value = true

  try {
    const { data } = await api.get('/empleados/buscar-rapido', {
      params: { q: q.value.trim() },
    })
    resultados.value = data.data || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Error buscando empleados'
    resultados.value = []
  } finally {
    buscando.value = false
  }
}
</script>

<style scoped>
.buscador-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  gap: 24px;
  background: var(--bg0, #0a0d12);
}

.buscador-card {
  width: 100%;
  max-width: 440px;
  background: var(--bg1, #131720);
  border: 0.5px solid var(--bdr, #232a38);
  border-radius: 16px;
  padding: 32px;
}

.buscador-header { text-align: center; margin-bottom: 24px; }
.buscador-icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--acc-dim, rgba(59,130,246,0.15)); color: var(--acc, #3b82f6);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; margin: 0 auto 12px;
}
.buscador-title { font-size: 20px; font-weight: 600; color: var(--tx0, #fff); margin: 0; }
.buscador-sub { font-size: 13px; color: var(--tx2, #9aa3af); margin-top: 4px; }

.buscador-form { display: flex; flex-direction: column; gap: 10px; }
.buscador-input {
  padding: 12px 14px; border-radius: 9px;
  border: 0.5px solid var(--bdr2, #2a2f3a); background: var(--bg2, #171c26);
  color: var(--tx0, #fff); font-size: 14px; font-family: inherit; outline: none;
}
.buscador-input:focus { border-color: var(--acc, #3b82f6); }

.buscador-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px; border-radius: 9px; border: none;
  background: var(--acc, #3b82f6); color: #fff; font-size: 14px; font-weight: 600;
  cursor: pointer; margin-top: 6px; transition: background .15s;
}
.buscador-btn:hover:not(:disabled) { background: var(--acc2, #2563eb); }
.buscador-btn:disabled { opacity: .6; cursor: not-allowed; }

.buscador-error { color: var(--red, #ef4444); font-size: 13px; text-align: center; margin-top: 12px; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .8s linear infinite; }

/* Resultados */
.resultados-wrap { width: 100%; max-width: 440px; }
.resultados-count { font-size: 12px; color: var(--tx2, #9aa3af); margin-bottom: 12px; text-align: center; }

.resultados-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.resultado-card-simple {
  background: var(--bg1, #131720); border: 0.5px solid var(--bdr, #232a38);
  border-radius: 12px; padding: 20px; text-align: center;
  display: flex; flex-direction: column; gap: 6px; align-items: center;
}
.resultado-nombre {
  font-size: 14px; font-weight: 600; color: var(--tx0, #fff);
  margin-bottom: 2px;
}
.resultado-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: .6px;
  color: var(--tx2, #9aa3af); font-weight: 600;
}
.resultado-no-grande {
  font-family: monospace; font-size: 28px; font-weight: 800;
  color: var(--acc, #3b82f6); line-height: 1; letter-spacing: 1px;
}

.sin-resultados {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  color: var(--tx2, #9aa3af); font-size: 13px; padding: 40px;
}
.sin-resultados i { font-size: 32px; }
</style>