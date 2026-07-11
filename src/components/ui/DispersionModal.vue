<template>
  <div class="dispersion-modal">
    <h3>Generar dispersión — {{ nomina?.nombre }}</h3>

    <div v-if="nomina?.estatus !== 'aprobada' && nomina?.estatus !== 'dispersada'" class="aviso-warning">
      ⚠️ La nómina debe estar <strong>aprobada</strong> para generar la dispersión.
      Estatus actual: <strong>{{ nomina?.estatus }}</strong>
    </div>

    <div v-else class="cards-grid">

      <!-- ═══ CARD IAS — fijo, sin selector ═══ -->
      <div class="card-dispersion" :class="{ 'card-completada': nomina?.ias_dispersado }">
        <div class="card-icono card-icono--verde"><i class="ti ti-cash"></i></div>
        <div class="card-body">
          <div class="card-header-row">
            <span class="card-titulo">Dispersión IAS</span>
            <span class="badge-fijo">Formato fijo — SPEI</span>
          </div>
          <p class="card-desc">Se genera siempre en formato SPEI genérico. No tiene selector.</p>

          <div v-if="nomina?.ias_dispersado" class="card-ya-dispersada">
            <i class="ti ti-circle-check-filled"></i> Dispersada el {{ formatFecha(nomina.ias_dispersado_at) }}
          </div>

          <button class="btn-descargar" :class="{ 'btn-descargar--secundario': nomina?.ias_dispersado }"
                  :disabled="descargando === 'ias'" @click="descargar('ias')">
            {{ descargando === 'ias' ? 'Generando...' : (nomina?.ias_dispersado ? '↻ Volver a descargar' : '⬇ Descargar dispersión IAS (.csv)') }}
          </button>
        </div>
      </div>

      <!-- ═══ NÓMINA FISCAL — selector en formato de cards clicables ═══ -->
      <div class="card-dispersion" :class="{ 'card-completada': nomina?.fiscal_dispersado }">
        <div class="card-icono card-icono--azul"><i class="ti ti-building-bank"></i></div>
        <div class="card-body" style="width:100%">
          <div class="card-header-row">
            <span class="card-titulo">Dispersión Nómina Fiscal</span>
          </div>
          <p class="card-desc">Elige el banco con el que se va a dispersar esta corrida.</p>

          <!-- Sub-cards de formato, clicables, estilo Importaciones -->
          <div class="formato-opciones">
            <div
              v-for="opt in formatosFiscal"
              :key="opt.value"
              class="formato-card"
              :class="{ activo: formatoFiscal === opt.value, deshabilitado: opt.pendiente }"
              @click="!opt.pendiente && (formatoFiscal = opt.value)"
            >
              <div class="formato-check">
                <i v-if="formatoFiscal === opt.value" class="ti ti-check"></i>
              </div>
              <div class="formato-icono" :class="opt.color"><i :class="opt.icono"></i></div>
              <div class="formato-info">
                <h4>{{ opt.label }}</h4>
                <p>{{ opt.desc }}</p>
              </div>
              <span v-if="opt.pendiente" class="soon-badge">En desarrollo</span>
            </div>
          </div>

          <div v-if="nomina?.fiscal_dispersado" class="card-ya-dispersada">
            <i class="ti ti-circle-check-filled"></i>
            Dispersada el {{ formatFecha(nomina.fiscal_dispersado_at) }}
            <span class="formato-usado">({{ (nomina.fiscal_formato || '').toUpperCase() }})</span>
          </div>

          <button class="btn-descargar" :class="{ 'btn-descargar--secundario': nomina?.fiscal_dispersado }"
                  :disabled="descargando === 'fiscal'" @click="descargar('fiscal')">
            {{ descargando === 'fiscal' ? 'Generando...' : (nomina?.fiscal_dispersado ? '↻ Volver a descargar' : `⬇ Descargar dispersión fiscal (${formatoFiscal.toUpperCase()})`) }}
          </button>
        </div>
      </div>

      <!-- ═══ Banner cuando YA se completaron ambas dispersiones ═══ -->
      <div v-if="nomina?.ias_dispersado && nomina?.fiscal_dispersado" class="banner-completo">
        <i class="ti ti-circle-check-filled"></i>
        Nómina completamente dispersada — ya puedes cerrar esta ventana.
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/services/api.js'

const props = defineProps({
  nomina: { type: Object, required: true },
})

const formatosFiscal = [
  { value: 'albo',      label: 'ALBO',      desc: 'Transferencia múltiple',      icono: 'ti ti-building-bank', color: 'azul',    pendiente: false },
  { value: 'bajio',     label: 'BanBajío',  desc: 'Macro alta de cuentas',       icono: 'ti ti-building-bank', color: 'morado',  pendiente: true  },
  { value: 'sindicato', label: 'Sindicato', desc: 'FUO — Formato Único de Operación', icono: 'ti ti-users', color: 'ambar',   pendiente: true  },
]

const formatoFiscal = ref('albo')
const descargando = ref(null)
const error = ref(null)

function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha.replace(' ', 'T')).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

async function descargar(tipo) {
  descargando.value = tipo
  error.value = null
  try {
    const url = tipo === 'ias'
      ? `/nomina-fatiga/${props.nomina.id}/dispersion-ias`
      : `/nomina-fatiga/${props.nomina.id}/dispersion-fiscal`
    const params = tipo === 'fiscal' ? { formato: formatoFiscal.value } : {}
    const response = await api.get(url, { params, responseType: 'blob' })

    const disposition = response.headers['content-disposition'] || ''
    const match = disposition.match(/filename="(.+)"/)
    const nombreArchivo = match ? match[1] : `dispersion_${tipo}_${props.nomina.id}.csv`

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = blobUrl
    link.setAttribute('download', nombreArchivo)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(blobUrl)

    if (tipo === 'ias') {
      props.nomina.ias_dispersado = 1
      props.nomina.ias_dispersado_at = new Date().toISOString()
    } else {
      props.nomina.fiscal_dispersado = 1
      props.nomina.fiscal_dispersado_at = new Date().toISOString()
      props.nomina.fiscal_formato = formatoFiscal.value
    }
  } catch (e) {
    if (e.response?.data instanceof Blob) {
      const texto = await e.response.data.text()
      try { error.value = JSON.parse(texto).message || 'Error generando la dispersión' }
      catch { error.value = 'Error generando la dispersión' }
    } else {
      error.value = e.response?.data?.message || 'Error generando la dispersión'
    }
  } finally {
    descargando.value = null
  }
}
</script>

<style scoped>
.dispersion-modal { padding: 1.5rem; max-width: 540px; }
.aviso-warning { background: #3a2a10; color: #ffb74d; padding: .75rem 1rem; border-radius: 8px; font-size: .9rem; }

.cards-grid { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }

.card-dispersion {
  display: flex; gap: 12px;
  border: 1px solid var(--bdr2, #2a2f3a); border-radius: 12px;
  padding: 1rem; background: var(--bg2, #151a23); transition: border-color .15s;
}
.card-dispersion.card-completada { border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.04); }

.card-icono {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.card-icono--verde { background: rgba(34,197,94,.15); color: #22c55e; }
.card-icono--azul  { background: rgba(59,130,246,.15); color: #3b82f6; }

.card-body { flex: 1; min-width: 0; }
.card-header-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.card-titulo { font-weight: 600; font-size: .95rem; }
.badge-fijo { font-size: 11px; color: #22c55e; background: rgba(34,197,94,.12); padding: 2px 8px; border-radius: 20px; }
.card-desc { font-size: .82rem; color: var(--tx2, #9aa3af); margin: 0 0 .75rem; }

/* ── Sub-cards de formato bancario, estilo Importaciones ── */
.formato-opciones { display: flex; flex-direction: column; gap: 8px; margin-bottom: .75rem; }
.formato-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--bdr2, #2a2f3a); background: var(--bg1, #0e1218);
  cursor: pointer; transition: all .15s;
}
.formato-card:hover:not(.deshabilitado) { border-color: var(--acc, #3b82f6); background: var(--bg2, #151a23); }
.formato-card.activo { border-color: var(--acc, #3b82f6); background: rgba(59,130,246,.08); }
.formato-card.deshabilitado { opacity: .5; cursor: not-allowed; }

.formato-check {
  width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
  border: 1.5px solid var(--bdr2, #2a2f3a); background: var(--bg1, #0e1218);
  display: flex; align-items: center; justify-content: center; font-size: 11px; color: #fff;
}
.formato-card.activo .formato-check { background: var(--acc, #3b82f6); border-color: var(--acc, #3b82f6); }

.formato-icono {
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}
.formato-icono.azul   { background: rgba(59,130,246,.15); color: #3b82f6; }
.formato-icono.morado { background: rgba(168,85,247,.15); color: #a855f7; }
.formato-icono.ambar  { background: rgba(245,158,11,.15); color: #f59e0b; }

.formato-info { flex: 1; min-width: 0; }
.formato-info h4 { font-size: .85rem; font-weight: 600; margin: 0; }
.formato-info p { font-size: .75rem; color: var(--tx2, #9aa3af); margin: 2px 0 0; }

.soon-badge {
  font-size: 10px; padding: 2px 7px; border-radius: 20px;
  background: var(--bg3, #1d2330); color: var(--tx2, #9aa3af); flex-shrink: 0;
}

.card-ya-dispersada { display: flex; align-items: center; gap: 6px; font-size: .8rem; color: #22c55e; margin-bottom: .75rem; }
.formato-usado { color: var(--tx2, #9aa3af); font-size: .75rem; }

.btn-descargar {
  width: 100%; padding: .65rem; background: #2563eb; color: #fff;
  border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
}
.btn-descargar--secundario { background: transparent; border: 1px solid var(--bdr2, #2a2f3a); color: var(--tx1, #d1d5db); }
.btn-descargar:disabled { opacity: .6; cursor: not-allowed; }

.banner-completo {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px; border-radius: 10px;
  background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.3);
  color: #22c55e; font-size: .85rem; font-weight: 500;
}

.error-msg { color: #ef4444; margin-top: .5rem; font-size: .85rem; }
</style>