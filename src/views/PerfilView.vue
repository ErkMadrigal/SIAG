<template>
  <div class="perfil-wrap">

    <!-- Header -->
    <div class="perfil-header">
      <div class="perfil-avatar">
        <AvatarInitials :initials="auth.userInitials" :size="64" :fontSize="24" />
        <div class="perfil-avatar-info">
          <h1 class="perfil-nombre">{{ auth.userName }}</h1>
          <span class="perfil-rol">{{ auth.user?.rol }}</span>
          <span class="perfil-correo">{{ auth.user?.correo }}</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="perfil-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="ptab"
          :class="{ active: activeTab === tab.key }"
          @click="cambiarTab(tab.key)"
        >
          <i :class="['ti', tab.icon]"></i>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- ── Tab: Mi Perfil ── -->
    <div v-if="activeTab === 'perfil'" class="perfil-body">
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-user" style="font-size:15px;color:var(--tx2)"></i>
          <span class="sec-title">Información personal</span>
        </div>
        <div class="sec-body">
          <div class="form-grid">
            <div class="field">
              <label class="flabel">Nombre completo</label>
              <input class="finput" v-model="form.nombre" placeholder="Tu nombre completo" />
            </div>
            <div class="field">
              <label class="flabel">Correo electrónico</label>
              <input class="finput" v-model="form.correo" type="email" placeholder="correo@ejemplo.com" />
            </div>
            <div class="field">
              <label class="flabel">Usuario</label>
              <input class="finput" :value="auth.user?.username" disabled />
            </div>
            <div class="field">
              <label class="flabel">Rol</label>
              <input class="finput" :value="auth.user?.rol" disabled />
            </div>
          </div>

          <div class="form-footer">
            <span v-if="msgPerfil" class="form-msg" :class="msgPerfilType">
              <i :class="['ti', msgPerfilType === 'ok' ? 'ti-circle-check' : 'ti-alert-circle']"></i>
              {{ msgPerfil }}
            </span>
            <button class="btn-primary" :disabled="savingPerfil" @click="guardarPerfil">
              <i v-if="savingPerfil" class="ti ti-loader-2 spin"></i>
              <i v-else class="ti ti-device-floppy"></i>
              {{ savingPerfil ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Info de sesión (solo lectura) -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-info-circle" style="font-size:15px;color:var(--tx2)"></i>
          <span class="sec-title">Información de cuenta</span>
        </div>
        <div class="sec-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">ID de usuario</span>
              <span class="info-val">#{{ auth.user?.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Nivel de acceso</span>
              <span class="info-val">Nivel {{ auth.user?.nivel ?? auth.user?.rol_nivel }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado</span>
              <span class="badge-active"><i class="ti ti-circle-filled" style="font-size:8px"></i> Activo</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: Configuración ── -->
    <div v-if="activeTab === 'config'" class="perfil-body">
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-palette" style="font-size:15px;color:var(--tx2)"></i>
          <span class="sec-title">Apariencia</span>
        </div>
        <div class="sec-body">
          <div class="config-row">
            <div class="config-info">
              <span class="config-label">Tema del sistema</span>
              <span class="config-sub">Cambia entre modo oscuro y claro</span>
            </div>
            <div class="theme-toggle-wrap">
              <button
                class="theme-opt"
                :class="{ active: !ui.isDark }"
                @click="ui.isDark && ui.toggleTheme()"
              >
                <i class="ti ti-sun"></i> Claro
              </button>
              <button
                class="theme-opt"
                :class="{ active: ui.isDark }"
                @click="!ui.isDark && ui.toggleTheme()"
              >
                <i class="ti ti-moon"></i> Oscuro
              </button>
            </div>
          </div>

          <div class="config-divider"></div>

          <div class="config-row">
            <div class="config-info">
              <span class="config-label">Sidebar contraído por defecto</span>
              <span class="config-sub">El menú lateral inicia minimizado</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="prefSidebarColapsed" @change="guardarPrefs" />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>

          <div class="config-divider"></div>

          <div class="config-row">
            <div class="config-info">
              <span class="config-label">Animaciones de interfaz</span>
              <span class="config-sub">Transiciones y efectos visuales</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="prefAnimaciones" @change="guardarPrefs" />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
        </div>
      </div>

      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-bell" style="font-size:15px;color:var(--tx2)"></i>
          <span class="sec-title">Notificaciones</span>
        </div>
        <div class="sec-body">
          <div class="config-row">
            <div class="config-info">
              <span class="config-label">Incidencias pendientes</span>
              <span class="config-sub">Alertas cuando hay incidencias sin aprobar</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="prefNotifIncidencias" @change="guardarPrefs" />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>

          <div class="config-divider"></div>

          <div class="config-row">
            <div class="config-info">
              <span class="config-label">Aviso de inactividad</span>
              <span class="config-sub">Modal antes de cerrar sesión automáticamente</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="prefAvisoInactividad" @change="guardarPrefs" />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab: Cambiar contraseña ── -->
    <div v-if="activeTab === 'password'" class="perfil-body">
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-shield-lock" style="font-size:15px;color:var(--tx2)"></i>
          <span class="sec-title">Cambiar contraseña</span>
        </div>
        <div class="sec-body">
          <div class="form-grid single">

            <div class="field">
              <label class="flabel">Contraseña actual</label>
              <div class="input-wrap">
                <input
                  class="finput"
                  :type="showActual ? 'text' : 'password'"
                  v-model="pwd.actual"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button class="eye-btn" @click="showActual = !showActual" tabindex="-1">
                  <i :class="['ti', showActual ? 'ti-eye-off' : 'ti-eye']"></i>
                </button>
              </div>
            </div>

            <div class="field">
              <label class="flabel">Nueva contraseña</label>
              <div class="input-wrap">
                <input
                  class="finput"
                  :type="showNueva ? 'text' : 'password'"
                  v-model="pwd.nueva"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
                <button class="eye-btn" @click="showNueva = !showNueva" tabindex="-1">
                  <i :class="['ti', showNueva ? 'ti-eye-off' : 'ti-eye']"></i>
                </button>
              </div>
              <!-- Indicador de fuerza -->
              <div v-if="pwd.nueva" class="pwd-strength">
                <div class="strength-bars">
                  <div
                    v-for="i in 4" :key="i"
                    class="sbar"
                    :class="{ active: pwdStrength >= i, [pwdStrengthColor]: pwdStrength >= i }"
                  ></div>
                </div>
                <span class="strength-label" :class="pwdStrengthColor">{{ pwdStrengthLabel }}</span>
              </div>
            </div>

            <div class="field">
              <label class="flabel">Confirmar nueva contraseña</label>
              <div class="input-wrap">
                <input
                  class="finput"
                  :class="{ error: pwd.confirmar && pwd.nueva !== pwd.confirmar }"
                  :type="showConfirmar ? 'text' : 'password'"
                  v-model="pwd.confirmar"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
                <button class="eye-btn" @click="showConfirmar = !showConfirmar" tabindex="-1">
                  <i :class="['ti', showConfirmar ? 'ti-eye-off' : 'ti-eye']"></i>
                </button>
              </div>
              <span v-if="pwd.confirmar && pwd.nueva !== pwd.confirmar" class="field-error">
                Las contraseñas no coinciden
              </span>
            </div>

          </div>

          <div class="form-footer">
            <span v-if="msgPwd" class="form-msg" :class="msgPwdType">
              <i :class="['ti', msgPwdType === 'ok' ? 'ti-circle-check' : 'ti-alert-circle']"></i>
              {{ msgPwd }}
            </span>
            <button
              class="btn-primary"
              :disabled="savingPwd || !pwdValido"
              @click="cambiarPassword"
            >
              <i v-if="savingPwd" class="ti ti-loader-2 spin"></i>
              <i v-else class="ti ti-lock-check"></i>
              {{ savingPwd ? 'Actualizando...' : 'Actualizar contraseña' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tips de seguridad -->
      <div class="sec tips-sec">
        <div class="sec-hdr">
          <i class="ti ti-bulb" style="font-size:15px;color:var(--amb)"></i>
          <span class="sec-title">Recomendaciones</span>
        </div>
        <div class="sec-body tips-body">
          <div class="tip"><i class="ti ti-check"></i> Mínimo 8 caracteres</div>
          <div class="tip"><i class="ti ti-check"></i> Combina letras mayúsculas y minúsculas</div>
          <div class="tip"><i class="ti ti-check"></i> Incluye números y símbolos</div>
          <div class="tip"><i class="ti ti-check"></i> No reutilices contraseñas anteriores</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore }   from '@/stores/ui.js'
import { authService }  from '@/services/auth.service.js'
import AvatarInitials   from '@/components/ui/AvatarInitials.vue'

const auth   = useAuthStore()
const ui     = useUiStore()
const route  = useRoute()
const router = useRouter()

// ── Tabs ──────────────────────────────────────────────
const tabs = [
  { key: 'perfil',   label: 'Mi perfil',          icon: 'ti-user' },
  { key: 'config',   label: 'Configuración',       icon: 'ti-settings' },
  { key: 'password', label: 'Cambiar contraseña',  icon: 'ti-shield-lock' },
]
const activeTab = ref(route.query.tab || 'perfil')

watch(() => route.query.tab, (tab) => {
  if (tab) activeTab.value = tab
})

function cambiarTab(key) {
  activeTab.value = key
  router.replace({ query: { tab: key } })
}

// ── Formulario perfil ─────────────────────────────────
const form = ref({
  nombre: auth.user?.nombre || '',
  correo: auth.user?.correo || '',
})
const savingPerfil  = ref(false)
const msgPerfil     = ref('')
const msgPerfilType = ref('ok')

async function guardarPerfil() {
  if (!form.value.nombre || !form.value.correo) return
  savingPerfil.value = true
  msgPerfil.value    = ''
  try {
    await authService.updateMe(form.value)
    // Actualizar store local
    if (auth.user) {
      auth.user.nombre = form.value.nombre
      auth.user.correo = form.value.correo
      localStorage.setItem('user', JSON.stringify(auth.user))
    }
    msgPerfil.value    = 'Cambios guardados correctamente'
    msgPerfilType.value = 'ok'
  } catch (err) {
    msgPerfil.value    = err?.response?.data?.message || 'Error al guardar'
    msgPerfilType.value = 'err'
  } finally {
    savingPerfil.value = false
    setTimeout(() => { msgPerfil.value = '' }, 4000)
  }
}

// ── Preferencias (localStorage) ───────────────────────
const prefSidebarColapsed  = ref(false)
const prefAnimaciones       = ref(true)
const prefNotifIncidencias  = ref(true)
const prefAvisoInactividad  = ref(true)

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Mi perfil', to: '/perfil' },
  ])
  // Cargar prefs guardadas
  try {
    const saved = JSON.parse(localStorage.getItem('skynet_prefs') || '{}')
    prefSidebarColapsed.value = saved.sidebarColapsed ?? false
    prefAnimaciones.value      = saved.animaciones      ?? true
    prefNotifIncidencias.value = saved.notifIncidencias ?? true
    prefAvisoInactividad.value = saved.avisoInactividad ?? true
  } catch {}
})

function guardarPrefs() {
  localStorage.setItem('skynet_prefs', JSON.stringify({
    sidebarColapsed:  prefSidebarColapsed.value,
    animaciones:       prefAnimaciones.value,
    notifIncidencias:  prefNotifIncidencias.value,
    avisoInactividad:  prefAvisoInactividad.value,
  }))
}

// ── Cambiar contraseña ────────────────────────────────
const pwd = ref({ actual: '', nueva: '', confirmar: '' })
const showActual   = ref(false)
const showNueva    = ref(false)
const showConfirmar = ref(false)
const savingPwd    = ref(false)
const msgPwd       = ref('')
const msgPwdType   = ref('ok')

const pwdStrength = computed(() => {
  const p = pwd.value.nueva
  if (!p) return 0
  let s = 0
  if (p.length >= 8)          s++
  if (/[A-Z]/.test(p))        s++
  if (/[0-9]/.test(p))        s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})
const pwdStrengthLabel = computed(() => {
  return ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][pwdStrength.value]
})
const pwdStrengthColor = computed(() => {
  return ['', 'red', 'amber', 'blue', 'green'][pwdStrength.value]
})
const pwdValido = computed(() =>
  pwd.value.actual &&
  pwd.value.nueva.length >= 6 &&
  pwd.value.nueva === pwd.value.confirmar
)

async function cambiarPassword() {
  if (!pwdValido.value) return
  savingPwd.value = true
  msgPwd.value    = ''
  try {
    await authService.cambiarPassword({
      password_actual: pwd.value.actual,
      password_nuevo:  pwd.value.nueva,
    })
    msgPwd.value    = 'Contraseña actualizada correctamente'
    msgPwdType.value = 'ok'
    pwd.value = { actual: '', nueva: '', confirmar: '' }
  } catch (err) {
    msgPwd.value    = err?.response?.data?.message || 'Error al cambiar la contraseña'
    msgPwdType.value = 'err'
  } finally {
    savingPwd.value = false
    setTimeout(() => { msgPwd.value = '' }, 5000)
  }
}
</script>

<style scoped>
.perfil-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 780px;
  margin: 0 auto;
}

/* ── Header ── */
.perfil-header {
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  overflow: hidden;
}
.perfil-avatar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 20px 16px;
}
.perfil-avatar-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.perfil-nombre {
  font-size: 18px;
  font-weight: 600;
  color: var(--tx0);
  letter-spacing: -0.3px;
}
.perfil-rol {
  font-size: 10px;
  color: var(--acc);
  background: var(--acc-dim);
  padding: 2px 8px;
  border-radius: 20px;
  display: inline-block;
  width: fit-content;
  text-transform: capitalize;
}
.perfil-correo {
  font-size: 12px;
  color: var(--tx2);
}

/* Tabs */
.perfil-tabs {
  display: flex;
  border-top: 0.5px solid var(--bdr);
  padding: 0 12px;
  gap: 2px;
}
.ptab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--tx2);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
  margin-bottom: -0.5px;
}
.ptab i { font-size: 15px; }
.ptab:hover { color: var(--tx0); }
.ptab.active {
  color: var(--acc);
  border-bottom-color: var(--acc);
  font-weight: 500;
}

/* ── Body ── */
.perfil-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Secciones ── */
.sec {
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  overflow: hidden;
}
.sec-hdr {
  padding: 12px 16px;
  border-bottom: 0.5px solid var(--bdr);
  display: flex;
  align-items: center;
  gap: 8px;
}
.sec-title { font-size: 13px; font-weight: 500; color: var(--tx0); }
.sec-body  { padding: 16px; }

/* ── Form ── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.form-grid.single { grid-template-columns: 1fr; max-width: 440px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.flabel {
  font-size: 11px;
  font-weight: 500;
  color: var(--tx2);
  text-transform: uppercase;
  letter-spacing: .6px;
}
.finput {
  background: var(--bg2);
  border: 0.5px solid var(--bdr2);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--tx0);
  font-family: inherit;
  outline: none;
  transition: border .15s;
  width: 100%;
  box-sizing: border-box;
}
.finput:focus  { border-color: var(--acc); }
.finput:disabled { opacity: .5; cursor: not-allowed; }
.finput.error  { border-color: var(--red); }

.input-wrap { position: relative; }
.input-wrap .finput { padding-right: 36px; }
.eye-btn {
  position: absolute;
  right: 8px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  color: var(--tx2); cursor: pointer;
  font-size: 16px; padding: 4px;
}
.eye-btn:hover { color: var(--tx0); }

.field-error {
  font-size: 11px;
  color: var(--red);
  margin-top: 2px;
}

/* Password strength */
.pwd-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.strength-bars { display: flex; gap: 4px; }
.sbar {
  width: 32px; height: 4px;
  border-radius: 4px;
  background: var(--bg3);
  transition: background .3s;
}
.sbar.active.red   { background: var(--red); }
.sbar.active.amber { background: var(--amb); }
.sbar.active.blue  { background: var(--acc); }
.sbar.active.green { background: var(--grn); }
.strength-label { font-size: 11px; font-weight: 500; }
.strength-label.red   { color: var(--red); }
.strength-label.amber { color: var(--amb); }
.strength-label.blue  { color: var(--acc); }
.strength-label.green { color: var(--grn); }

/* Form footer */
.form-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 0.5px solid var(--bdr);
}
.form-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-right: auto;
}
.form-msg.ok  { color: var(--grn); }
.form-msg.err { color: var(--red); }
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 8px;
  background: var(--acc);
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background .15s;
}
.btn-primary:hover:not(:disabled) { background: var(--acc2); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

/* ── Info grid ── */
.info-grid {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-label { font-size: 11px; color: var(--tx2); text-transform: uppercase; letter-spacing: .6px; font-weight: 500; }
.info-val   { font-size: 14px; color: var(--tx0); font-weight: 500; }
.badge-active {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--grn);
  background: var(--grn-dim);
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 500;
  width: fit-content;
}

/* ── Config ── */
.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
}
.config-info { display: flex; flex-direction: column; gap: 2px; }
.config-label { font-size: 13px; color: var(--tx0); font-weight: 500; }
.config-sub   { font-size: 11px; color: var(--tx2); }
.config-divider { height: 0.5px; background: var(--bdr); margin: 2px 0; }

/* Theme toggle */
.theme-toggle-wrap { display: flex; gap: 4px; }
.theme-opt {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2);
  background: transparent; color: var(--tx2);
  font-size: 12px; cursor: pointer;
  font-family: inherit; transition: all .15s;
}
.theme-opt:hover { background: var(--bg2); color: var(--tx0); }
.theme-opt.active { background: var(--acc-dim); border-color: var(--acc); color: var(--acc); }

/* Toggle switch */
.toggle-switch { position: relative; display: inline-block; cursor: pointer; }
.toggle-switch input { display: none; }
.toggle-track {
  display: block;
  width: 40px; height: 22px;
  background: var(--bg3);
  border-radius: 20px;
  border: 0.5px solid var(--bdr2);
  position: relative;
  transition: background .2s;
}
.toggle-switch input:checked + .toggle-track { background: var(--acc); border-color: var(--acc); }
.toggle-thumb {
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform .2s;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
}
.toggle-switch input:checked + .toggle-track .toggle-thumb { transform: translateX(18px); }

/* ── Tips ── */
.tips-body { display: flex; flex-direction: column; gap: 8px; }
.tip {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: var(--tx2);
}
.tip i { color: var(--grn); font-size: 14px; }

/* ── Spin ── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .7s linear infinite; }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .info-grid { flex-direction: column; gap: 14px; }
}
</style>