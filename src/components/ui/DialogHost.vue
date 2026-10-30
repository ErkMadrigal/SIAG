<template>
  <Teleport to="body">
    <Transition name="dlg">
      <div v-if="state.abierto" class="dlg-overlay" @click.self="state.modo === 'alerta' && cerrarDialogo(true)" @keydown.esc="cerrarDialogo(false)">
        <div class="dlg-box" :class="state.tipo" role="dialog" aria-modal="true">
          <div class="dlg-ico"><i :class="['ti', icono]"></i></div>
          <h3 class="dlg-t">{{ state.titulo }}</h3>
          <p class="dlg-m" v-if="state.mensaje">{{ state.mensaje }}</p>
          <div class="dlg-btns">
            <button v-if="state.modo === 'confirmar'" class="dlg-btn" @click="cerrarDialogo(false)">{{ state.cancelText }}</button>
            <button class="dlg-btn main" ref="okBtn" @click="cerrarDialogo(true)">{{ state.confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, watch, nextTick, ref } from 'vue'
import { useDialog, cerrarDialogo } from '@/composables/useDialog.js'

const { state } = useDialog()
const okBtn = ref(null)
const icono = computed(() => ({
  info: 'ti-info-circle', exito: 'ti-circle-check', aviso: 'ti-alert-triangle', error: 'ti-circle-x', peligro: 'ti-trash',
}[state.tipo] || 'ti-info-circle'))

watch(() => state.abierto, v => { if (v) nextTick(() => okBtn.value?.focus()) })
</script>

<style scoped>
.dlg-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(5,10,24,.62); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.dlg-box { width: 100%; max-width: 380px; background: var(--bg1, #171c28); border: 1px solid var(--bdr, #263046); border-radius: 20px; padding: 26px 22px 20px; text-align: center; box-shadow: 0 24px 70px rgba(0,0,0,.5); color: var(--tx0, #e8ecf4); }
.dlg-ico { width: 62px; height: 62px; margin: 0 auto 14px; border-radius: 50%; display: grid; place-items: center; font-size: 30px; background: rgba(79,142,247,.15); color: #4f8ef7; }
.exito .dlg-ico { background: rgba(34,201,122,.15); color: #22c97a; }
.aviso .dlg-ico { background: rgba(245,166,35,.16); color: #f5a623; }
.error .dlg-ico, .peligro .dlg-ico { background: rgba(240,84,84,.15); color: #f05454; }
.dlg-t { margin: 0 0 6px; font-size: 18px; font-weight: 700; }
.dlg-m { margin: 0 0 18px; font-size: 13.5px; line-height: 1.5; color: var(--tx2, #9aa4b2); white-space: pre-line; }
.dlg-btns { display: flex; gap: 10px; }
.dlg-btn { flex: 1; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--bdr, #263046); background: transparent; color: inherit; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; }
.dlg-btn.main { background: #4f8ef7; border-color: #4f8ef7; color: #fff; }
.exito .dlg-btn.main { background: #22c97a; border-color: #22c97a; color: #04261a; }
.aviso .dlg-btn.main { background: #f5a623; border-color: #f5a623; color: #2a1c00; }
.error .dlg-btn.main, .peligro .dlg-btn.main { background: #f05454; border-color: #f05454; color: #fff; }
.dlg-btn:hover { filter: brightness(1.08); }
.dlg-enter-active, .dlg-leave-active { transition: opacity .18s; } .dlg-enter-active .dlg-box { animation: dlg-pop .22s ease; }
.dlg-enter-from, .dlg-leave-to { opacity: 0; }
@keyframes dlg-pop { from { transform: scale(.92) translateY(8px); } to { transform: none; } }
</style>
