<template>
  <Teleport to="body">
    <Transition name="ar" appear>
      <div class="ar-overlay" @click.self="$emit('close')">
        <div class="ar-box">
          <div class="ar-hdr">
            <div>
              <h2><i class="ti ti-face-id"></i> Rostro y app</h2>
              <p>{{ nombre }}</p>
            </div>
            <button class="ar-x" @click="$emit('close')"><i class="ti ti-x"></i></button>
          </div>

          <div class="ar-estado" :class="{ ok: enrolado }">
            <i :class="['ti', enrolado ? 'ti-circle-check' : 'ti-alert-circle']"></i>
            {{ enrolado ? 'Rostro enrolado' : 'Sin rostro enrolado' }}
          </div>

          <div class="ar-grid">
            <button class="ar-card main" @click="elegir('enrolar')">
              <span class="ar-ico"><i class="ti ti-camera"></i></span>
              <strong>{{ enrolado ? 'Volver a enrolar' : 'Enrolar rostro' }}</strong>
              <small>Captura el rostro aquí mismo con la cámara de la computadora.</small>
            </button>

            <button class="ar-card" :disabled="generandoLink" @click="elegir('link')">
              <span class="ar-ico"><i class="ti ti-link"></i></span>
              <strong>{{ generandoLink ? 'Generando…' : 'Link para el empleado' }}</strong>
              <small>Genera un enlace para que se enrole desde su celular.</small>
            </button>

            <button class="ar-card" @click="elegir('permisos')">
              <span class="ar-ico"><i class="ti ti-device-mobile-cog"></i></span>
              <strong>Permisos de la app</strong>
              <small>Decide qué partes del menú puede ver en el Kiosko.</small>
            </button>

            <button v-if="enrolado" class="ar-card danger" :disabled="reiniciando" @click="elegir('reset')">
              <span class="ar-ico"><i class="ti ti-refresh-alert"></i></span>
              <strong>{{ reiniciando ? 'Restableciendo…' : 'Restablecer enrolamiento' }}</strong>
              <small>Borra su rostro actual; la app lo mandará a enrolarse de nuevo con mejor nitidez.</small>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  nombre: { type: String, default: '' },
  enrolado: { type: Boolean, default: false },
  generandoLink: { type: Boolean, default: false },
  reiniciando: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'enrolar', 'link', 'permisos', 'reset'])
const elegir = (a) => emit(a)
</script>

<style scoped>
.ar-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(5,10,24,.62); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.ar-box { width: 100%; max-width: 560px; background: var(--bg1, #171c28); border: 0.5px solid var(--bdr, #263046); border-radius: 20px; padding: 20px; box-shadow: 0 24px 70px rgba(0,0,0,.5); }
.ar-hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.ar-hdr h2 { margin: 0; font-size: 17px; display: flex; gap: 8px; align-items: center; }
.ar-hdr p { margin: 4px 0 0; font-size: 12px; color: var(--tx2, #8b97ad); }
.ar-x { background: none; border: 0; color: var(--tx2, #8b97ad); font-size: 18px; cursor: pointer; }
.ar-estado { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; padding: 5px 11px; border-radius: 20px; background: rgba(245,166,35,.14); color: #f5a623; margin-bottom: 14px; }
.ar-estado.ok { background: rgba(34,201,122,.14); color: #22c97a; }
.ar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ar-card { text-align: left; display: flex; flex-direction: column; gap: 6px; padding: 14px; border-radius: 16px; border: 0.5px solid var(--bdr, #263046); background: var(--bg2, #1d2333); color: inherit; font: inherit; cursor: pointer; transition: transform .12s, border-color .12s; }
.ar-card:hover { transform: translateY(-2px); border-color: #4f8ef7; }
.ar-card:disabled { opacity: .6; cursor: wait; }
.ar-card strong { font-size: 13.5px; }
.ar-card small { font-size: 11.5px; line-height: 1.4; color: var(--tx2, #8b97ad); }
.ar-ico { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font-size: 21px; background: rgba(79,142,247,.15); color: #4f8ef7; }
.ar-card.main { background: rgba(79,142,247,.1); border-color: rgba(79,142,247,.4); }
.ar-card.danger .ar-ico { background: rgba(240,84,84,.15); color: #f05454; }
.ar-card.danger:hover { border-color: #f05454; }
@media (max-width: 520px) { .ar-grid { grid-template-columns: 1fr; } }
.ar-enter-active { transition: opacity .18s; } .ar-enter-from { opacity: 0; }
</style>
