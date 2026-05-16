<template>
  <div class="login-wrap">
    <div class="login-left">
      <div class="brand">
        <div class="brand-icon">
          <i class="ti ti-shield-half" aria-hidden="true"></i>
        </div>
        <div>
          <div class="brand-name">SkyNet</div>
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
      </div>

      <p class="login-footer">SkyNet SIA v1.0 · {{ new Date().getFullYear() }}</p>
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
import { sesionExpirada, resetSesionExpirada } from '@/composables/useInactividad.js'

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
</style>