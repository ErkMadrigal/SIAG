<template>
  <Teleport to="body">

    <!-- Aviso de inactividad -->
    <div v-if="mostrarAviso && !expirada" class="inact-overlay" @click.self="$emit('continuar')">
      <div class="inact-box">
        <div class="inact-icon amber">
          <i class="ti ti-clock-pause" aria-hidden="true"></i>
        </div>
        <h2 class="inact-title">¿Sigues ahí?</h2>
        <p class="inact-desc">Tu sesión cerrará por inactividad en</p>
        <div class="inact-contador">
          <span class="inact-num" :class="{ urgent: segundos <= 60 }">{{ segundos }}</span>
          <span class="inact-seg">segundos</span>
        </div>
        <div class="inact-progress">
          <div class="inact-bar"
            :class="{ red: segundos <= 60 }"
            :style="{ width: (segundos / 180 * 100) + '%' }">
          </div>
        </div>
        <div class="inact-actions">
          <button class="btn-continuar" @click="$emit('continuar')">
            <i class="ti ti-refresh" aria-hidden="true"></i>
            Continuar sesión
          </button>
          <button class="btn-salir" @click="$emit('salir')">
            Cerrar sesión ahora
          </button>
        </div>
      </div>
    </div>

    <!-- Modal sesión expirada -->
    <div v-if="expirada" class="expired-overlay">
      <div class="expired-bg"></div>
      <div class="expired-box">
        <div class="expired-glow"></div>
        <div class="inact-icon red" style="margin-bottom:8px">
          <i class="ti ti-lock" aria-hidden="true"></i>
        </div>
        <h2 class="inact-title">Sesión expirada</h2>
        <p class="inact-desc" style="max-width:260px">
          Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.
        </p>
        <button class="btn-login" @click="$emit('relogin')">
          <i class="ti ti-login" aria-hidden="true"></i>
          Iniciar sesión
        </button>
        <p class="expired-hint">Tus datos no se han perdido</p>
      </div>
    </div>

  </Teleport>
</template>

<script setup>
defineProps({
  segundos:  { type: Number,  default: 180 },
  mostrarAviso: { type: Boolean, default: false },
  expirada:  { type: Boolean, default: false },
})
defineEmits(['continuar', 'salir', 'relogin'])
</script>

<style scoped>
/* ── Overlay compartido ── */
.inact-overlay, .expired-overlay {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  animation: fadeIn .3s ease;
}
.inact-overlay {
  backdrop-filter: blur(8px);
  background: rgba(0,0,0,0.55);
}

/* ── Sesión expirada ── */
.expired-overlay {
  backdrop-filter: blur(20px) saturate(0.4);
  background: rgba(0,0,0,0.75);
}
.expired-bg {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, rgba(240,84,84,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.expired-box {
  position: relative;
  background: var(--bg1);
  border: 0.5px solid rgba(240,84,84,0.3);
  border-radius: 24px;
  padding: 40px 32px;
  width: 100%; max-width: 360px;
  display: flex; flex-direction: column;
  align-items: center; gap: 14px;
  text-align: center;
  box-shadow: 0 0 60px rgba(240,84,84,0.15), 0 20px 60px rgba(0,0,0,0.4);
  animation: slideUp .4s cubic-bezier(.34,1.56,.64,1);
}
.expired-glow {
  position: absolute; inset: -1px; border-radius: 24px;
  background: linear-gradient(135deg, rgba(240,84,84,0.15), transparent 60%);
  pointer-events: none;
}
.expired-hint {
  font-size: 11px; color: var(--tx3); margin-top: -4px;
}

/* ── Box aviso ── */
.inact-box {
  background: var(--bg1);
  border: 0.5px solid var(--bdr2);
  border-radius: 20px;
  padding: 32px 28px;
  width: 100%; max-width: 380px;
  display: flex; flex-direction: column;
  align-items: center; gap: 12px;
  text-align: center;
  animation: slideUp .3s cubic-bezier(.34,1.56,.64,1);
}

/* ── Iconos ── */
.inact-icon {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; margin-bottom: 4px;
  animation: pulse-icon 1.5s ease-in-out infinite;
}
.inact-icon.amber { background: var(--amb-dim); color: var(--amb); }
.inact-icon.red   {
  background: var(--red-dim); color: var(--red);
  animation: pulse-icon-red 1.2s ease-in-out infinite;
}

/* ── Textos ── */
.inact-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.inact-desc  { font-size: 13px; color: var(--tx2); line-height: 1.5; }

/* ── Contador ── */
.inact-contador { display: flex; align-items: baseline; gap: 6px; margin: 4px 0; }
.inact-num {
  font-size: 52px; font-weight: 700; color: var(--amb);
  letter-spacing: -2px; font-variant-numeric: tabular-nums;
  min-width: 80px; text-align: center; transition: color .3s;
}
.inact-num.urgent { color: var(--red); }
.inact-seg { font-size: 14px; color: var(--tx2); font-weight: 500; }

/* ── Progress ── */
.inact-progress {
  width: 100%; height: 4px;
  background: var(--bg3); border-radius: 4px; overflow: hidden;
}
.inact-bar {
  height: 100%; background: var(--amb); border-radius: 4px;
  transition: width 1s linear, background .3s;
}
.inact-bar.red { background: var(--red); }

/* ── Botones ── */
.inact-actions { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 8px; }
.btn-continuar {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px; border-radius: 10px; border: none;
  background: var(--acc); color: #fff;
  font-size: 14px; font-weight: 500; cursor: pointer;
  font-family: inherit; transition: background .15s; width: 100%;
}
.btn-continuar:hover { background: var(--acc2); }
.btn-salir {
  padding: 10px; border-radius: 10px;
  border: 0.5px solid var(--bdr2); background: transparent;
  color: var(--tx2); font-size: 13px; cursor: pointer;
  font-family: inherit; transition: all .15s; width: 100%;
}
.btn-salir:hover { background: var(--bg3); color: var(--tx0); }
.btn-login {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 32px; border-radius: 12px; border: none;
  background: var(--red); color: #fff;
  font-size: 15px; font-weight: 600; cursor: pointer;
  font-family: inherit; transition: all .15s; width: 100%;
  margin-top: 4px;
  box-shadow: 0 4px 20px rgba(240,84,84,0.3);
}
.btn-login:hover {
  background: #d94444;
  box-shadow: 0 6px 24px rgba(240,84,84,0.4);
  transform: translateY(-1px);
}

/* ── Animaciones ── */
@keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
@keyframes slideUp   { from { opacity:0; transform:translateY(20px) scale(.97); } to { opacity:1; transform:none; } }
@keyframes pulse-icon {
  0%,100% { transform: scale(1); }
  50%      { transform: scale(1.08); }
}
@keyframes pulse-icon-red {
  0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(240,84,84,0); }
  50%      { transform: scale(1.06); box-shadow: 0 0 0 8px rgba(240,84,84,0.15); }
}
</style>