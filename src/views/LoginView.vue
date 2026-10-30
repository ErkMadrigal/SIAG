<template>
  <div class="login-wrap">
    <div class="login-left">
      <div class="brand">
        <div class="brand-icon">
          <i class="ti ti-shield-half" aria-hidden="true"></i>
        </div>
        <div>
          <div class="brand-name">SIAG</div>
          <div class="brand-sub">Sistema Integral Administrativo</div>
        </div>
      </div>

      <div class="login-card">
        <h1 class="login-title">Bienvenido</h1>
        <p class="login-desc">Inicia sesión para continuar</p>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="field">
            <label class="field-label">Usuario</label>
            <div class="input-wrap" :class="{ error: errors.username }">
              <i class="ti ti-user" aria-hidden="true"></i>
              <input
                v-model="form.username"
                type="text"
                placeholder="tu.usuario"
                autocomplete="username"
                :disabled="loading"
              />
            </div>
            <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
          </div>

          <div class="field">
            <label class="field-label">Contraseña</label>
            <div class="input-wrap" :class="{ error: errors.password }">
              <i class="ti ti-lock" aria-hidden="true"></i>
              <input
                v-model="form.password"
                :type="showPass ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                :disabled="loading"
              />
              <button type="button" class="pass-toggle" @click="showPass = !showPass">
                <i :class="['ti', showPass ? 'ti-eye-off' : 'ti-eye']"></i>
              </button>
            </div>
            <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
          </div>

          <div v-if="errorMsg" class="alert-error">
            <i class="ti ti-alert-circle" aria-hidden="true"></i>
            {{ errorMsg }}
          </div>

          <button type="submit" class="btn-login" :disabled="loading">
            <span v-if="!loading">Iniciar sesión</span>
            <span v-else class="loading-row">
              <i class="ti ti-loader-2 spin"></i> Verificando...
            </span>
          </button>
        </form>

        <div class="login-alt">
          <router-link to="/asistencia" class="btn-asist"><i class="ti ti-fingerprint"></i> Tomar asistencia</router-link>
          <a :href="apkUrl" :download="apkUrl.split('/').pop()" class="btn-apk" :class="{ bajando }" @click="iniciarDescarga">
            <span class="apk-fill"></span>
            <span class="apk-ico">
              <i class="ti ti-arrow-down apk-arrow"></i>
              <span class="apk-tray"></span>
            </span>
            <span class="apk-txt">{{ bajando ? 'Descargando…' : 'Descargar app Android' }}</span>
          </a>
        </div>
      </div>

      <p class="login-footer">SIAG SIA v2.1.1 · {{ new Date().getFullYear() }}</p>
    </div>

    <div class="login-right">
      <div class="right-content">
        <div class="right-icon">
          <i class="ti ti-shield-check" aria-hidden="true"></i>
        </div>
        <h2>Control total de tu organización</h2>
        <p>Gestiona empleados, asistencias, incidencias y reportes desde un solo lugar.</p>
        <div class="feature-list">
          <div class="feature-item" v-for="f in features" :key="f.label">
            <div class="feature-icon">
              <i :class="['ti', f.icon]" aria-hidden="true"></i>
            </div>
            <span>{{ f.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

import axios from 'axios'
import { API_BASE } from '@/services/api.js'
// URL del APK: se toma de version.json (así siempre baja la última versión)
const apkUrl = ref(import.meta.env.BASE_URL + 'descarga/kiosko_SIAG.apk')
axios.get(API_BASE + '/app/version').then(r => { if (r.data?.data?.apk_url) apkUrl.value = r.data.data.apk_url }).catch(() => {})
import { sesionExpirada, resetSesionExpirada } from '@/composables/useInactividad.js'

// Animación de "descargando" al tocar el botón (la descarga real la hace el navegador)
const bajando = ref(false)
function iniciarDescarga() {
  if (bajando.value) return
  bajando.value = true
  setTimeout(() => { bajando.value = false }, 3200)
}

onMounted(() => {
  sesionExpirada.value = false
})

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const loading  = ref(false)
const showPass = ref(false)
const errorMsg = ref('')

const form   = reactive({ username: '', password: '' })
const errors = reactive({ username: '', password: '' })

const features = [
  { icon: 'ti-users',       label: 'Gestión de empleados' },
  { icon: 'ti-fingerprint', label: 'Control biométrico' },
  { icon: 'ti-chart-bar',   label: 'Reportes y pre-nómina' },
  { icon: 'ti-shield-lock', label: 'Roles y permisos' },
]

function validate() {
  errors.username = ''
  errors.password = ''
  let ok = true
  if (!form.username.trim()) { errors.username = 'El usuario es requerido'; ok = false }
  if (!form.password.trim()) { errors.password = 'La contraseña es requerida'; ok = false }
  return ok
}

async function handleLogin() {
  if (!validate()) return
  loading.value  = true
  errorMsg.value = ''
  try {
    sesionExpirada.value = false
    await auth.login({ username: form.username, password: form.password })
    router.push(route.query.redirect || '/')
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error
    errorMsg.value = msg || 'Usuario o contraseña incorrectos'
  } finally {
    loading.value = false
  }
}
</script>



<style scoped>
.login-wrap {
  display: flex;
  min-height: 100vh;
  background: var(--bg0);
}
.login-left {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 48px;
  background: var(--bg1);
  border-right: 0.5px solid var(--bdr);
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}
.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--acc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  flex-shrink: 0;
}
.brand-name { font-size: 18px; font-weight: 600; color: var(--tx0); }
.brand-sub  { font-size: 11px; color: var(--tx2); margin-top: 1px; }
.login-title { font-size: 22px; font-weight: 600; color: var(--tx0); margin-bottom: 6px; }
.login-desc  { font-size: 13px; color: var(--tx2); margin-bottom: 28px; }
.login-form  { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--tx1); }
.input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg2);
  border: 0.5px solid var(--bdr2);
  border-radius: 8px;
  padding: 0 12px;
  height: 42px;
  transition: border .15s;
}
.input-wrap:focus-within { border-color: var(--acc); }
.input-wrap.error        { border-color: var(--red); }
.input-wrap i { font-size: 16px; color: var(--tx2); flex-shrink: 0; }
.input-wrap input {
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--tx0);
  width: 100%;
  font-family: inherit;
}
.input-wrap input::placeholder { color: var(--tx3); }
.input-wrap input:disabled { opacity: .5; cursor: not-allowed; }
.pass-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--tx2);
  font-size: 16px;
  padding: 0;
  display: flex;
  align-items: center;
}
.pass-toggle:hover { color: var(--tx0); }
.field-error { font-size: 11px; color: var(--red); }
.alert-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--red-dim);
  border: 0.5px solid var(--red);
  border-radius: 8px;
  color: var(--red);
  font-size: 13px;
}
.btn-login {
  height: 42px;
  background: var(--acc);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background .15s;
  font-family: inherit;
  margin-top: 4px;
}
.btn-login:hover:not(:disabled) { background: var(--acc2); }
.btn-login:disabled { opacity: .6; cursor: not-allowed; }
.loading-row { display: flex; align-items: center; justify-content: center; gap: 8px; }
.login-footer { font-size: 11px; color: var(--tx3); margin-top: 32px; text-align: center; }

/* RIGHT PANEL — oculto en móvil */
.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: var(--bg0);
}
.right-content { max-width: 360px; }
.right-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: var(--acc-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--acc);
  margin-bottom: 24px;
}
.right-content h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--tx0);
  margin-bottom: 12px;
  line-height: 1.3;
}
.right-content p {
  font-size: 14px;
  color: var(--tx2);
  line-height: 1.6;
  margin-bottom: 28px;
}
.feature-list { display: flex; flex-direction: column; gap: 12px; }
.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--tx1);
}
.feature-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg2);
  border: 0.5px solid var(--bdr2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--acc);
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

/* RESPONSIVE */
@media (max-width: 768px) {
  .login-wrap {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 24px 16px;
  }
  .login-left {
    width: 100%;
    max-width: 100%;
    padding: 32px 24px;
    border-right: none;
    border-radius: 16px;
    border: 0.5px solid var(--bdr);
  }
  .login-right {
    display: none;
  }
  .brand {
    margin-bottom: 28px;
  }
}

.login-alt { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--bdr, #263046); }
.btn-asist, .btn-apk { height: 42px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 500; text-decoration: none; }
.btn-asist { background: rgba(52,211,153,.14); color: #34d399; border: 1px solid rgba(52,211,153,.35); }
.btn-asist:hover { background: rgba(52,211,153,.22); }

/* Botón de descarga neón */
.btn-apk {
  position: relative; overflow: hidden; isolation: isolate;
  color: #e6fbff; background: #0b1220;
  border: 1px solid #22d3ee;
  box-shadow: 0 0 6px rgba(34,211,238,.55), 0 0 18px rgba(34,211,238,.35), inset 0 0 12px rgba(34,211,238,.15);
  text-shadow: 0 0 8px rgba(34,211,238,.8);
  animation: apkGlow 2.4s ease-in-out infinite;
  transition: transform .15s;
}
.btn-apk:hover { transform: translateY(-1px); box-shadow: 0 0 10px #22d3ee, 0 0 28px rgba(34,211,238,.55), inset 0 0 16px rgba(34,211,238,.25); }
.btn-apk:active { transform: scale(.98); }
/* brillo que barre el botón */
.btn-apk::before {
  content: ''; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%; z-index: -1;
  background: linear-gradient(100deg, transparent, rgba(167,139,250,.45), rgba(34,211,238,.5), transparent);
  transform: skewX(-20deg);
  animation: apkSweep 3s ease-in-out infinite;
}
.apk-fill { position: absolute; inset: 0; z-index: -1; width: 0; background: linear-gradient(90deg, rgba(34,211,238,.35), rgba(167,139,250,.55)); }
.btn-apk.bajando .apk-fill { animation: apkFill 3.1s cubic-bezier(.3,.1,.3,1) forwards; }
.btn-apk.bajando { animation: none; box-shadow: 0 0 10px #a78bfa, 0 0 26px rgba(167,139,250,.55), inset 0 0 14px rgba(167,139,250,.25); border-color: #a78bfa; }

/* icono: flecha cayendo hacia la bandeja */
.apk-ico { position: relative; width: 20px; height: 22px; display: inline-flex; align-items: flex-start; justify-content: center; }
.apk-arrow { font-size: 17px; animation: apkDrop 1.3s ease-in infinite; filter: drop-shadow(0 0 4px #22d3ee); }
.apk-tray { position: absolute; left: 1px; right: 1px; bottom: 0; height: 5px; border: 2px solid #22d3ee; border-top: none; border-radius: 0 0 4px 4px; box-shadow: 0 0 6px #22d3ee; }
.btn-apk.bajando .apk-arrow { animation-duration: .6s; }

@keyframes apkDrop {
  0%   { transform: translateY(-9px); opacity: 0; }
  35%  { opacity: 1; }
  80%  { transform: translateY(5px); opacity: 1; }
  100% { transform: translateY(8px); opacity: 0; }
}
@keyframes apkGlow {
  0%,100% { box-shadow: 0 0 6px rgba(34,211,238,.55), 0 0 16px rgba(34,211,238,.3), inset 0 0 10px rgba(34,211,238,.12); }
  50%     { box-shadow: 0 0 10px rgba(34,211,238,.9), 0 0 30px rgba(34,211,238,.55), inset 0 0 16px rgba(34,211,238,.25); }
}
@keyframes apkSweep { 0% { left: -60%; } 55%,100% { left: 130%; } }
@keyframes apkFill  { to { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .btn-apk, .btn-apk::before, .apk-arrow { animation: none; } }
</style>