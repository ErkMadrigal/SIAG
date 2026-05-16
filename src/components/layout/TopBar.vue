<template>
  <header class="topbar">
    <button class="tb-btn" @click="ui.toggleSidebar()" aria-label="Toggle sidebar">
      <i class="ti ti-menu-2"></i>
    </button>

    <Breadcrumb />

    <button class="search-trigger" @click="ui.openCmdPalette()">
      <i class="ti ti-search" aria-hidden="true"></i>
      <span>Buscar empleado, reporte...</span>
      <kbd class="kb">Ctrl K</kbd>
    </button>

    <div class="topbar-right">
      <button class="tb-btn" @click="ui.toggleTheme()" :aria-label="ui.isDark ? 'Modo claro' : 'Modo oscuro'">
        <i :class="['ti', ui.isDark ? 'ti-sun' : 'ti-moon']"></i>
      </button>

      <button class="tb-btn" @click="ui.openMetodos()" aria-label="Métodos">
        <i class="ti ti-apps"></i>
      </button>

      <button class="tb-btn notif-btn" aria-label="Notificaciones">
        <i class="ti ti-bell"></i>
        <span class="notif-dot"></span>
      </button>

      <!-- Perfil dropdown -->
      <div class="profile-wrap" ref="profileRef">
        <div class="user-chip" @click="toggleProfile()">
          <AvatarInitials :initials="auth.userInitials" :size="24" :fontSize="10" />
          <span class="user-chip-name">{{ auth.userName || 'Usuario' }}</span>
          <i class="ti ti-chevron-down chip-arrow" :class="{ rotated: profileOpen }"></i>
        </div>

        <transition name="dropdown">
          <div v-if="profileOpen" class="profile-dropdown">
            <!-- Header -->
            <div class="pd-header">
              <AvatarInitials :initials="auth.userInitials" :size="40" :fontSize="15" />
              <div class="pd-info">
                <p class="pd-name">{{ auth.userName }}</p>
                <span class="pd-role">{{ auth.user?.rol }}</span>
                <span class="pd-correo">{{ auth.user?.correo }}</span>
              </div>
            </div>

            <div class="pd-divider"></div>

            <!-- Items -->
            <div class="pd-item">
              <i class="ti ti-user" aria-hidden="true"></i>
              Mi perfil
            </div>
            <div class="pd-item">
              <i class="ti ti-settings" aria-hidden="true"></i>
              Configuración
            </div>
            <div class="pd-item">
              <i class="ti ti-shield-lock" aria-hidden="true"></i>
              Cambiar contraseña
            </div>

            <div class="pd-divider"></div>

            <div class="pd-item danger" @click="handleLogout()">
              <i class="ti ti-logout" aria-hidden="true"></i>
              Cerrar sesión
            </div>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore }   from '@/stores/ui.js'
import Breadcrumb       from './Breadcrumb.vue'
import AvatarInitials   from '@/components/ui/AvatarInitials.vue'

const auth = useAuthStore()
const ui   = useUiStore()

const profileOpen = ref(false)
const profileRef  = ref(null)

function toggleProfile() {
  profileOpen.value = !profileOpen.value
}

function handleLogout() {
  profileOpen.value = false
  auth.logout()
}

function handleClickOutside(e) {
  if (profileRef.value && !profileRef.value.contains(e.target)) {
    profileOpen.value = false
  }
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    ui.openCmdPalette()
  }
  if (e.key === 'Escape') {
    ui.closeCmdPalette()
    ui.closeMetodos()
    profileOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('mousedown', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped>
.topbar {
  height: 50px;
  background: var(--bg1);
  border-bottom: 0.5px solid var(--bdr);
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 10px;
  flex-shrink: 0;
}
.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg2);
  border: 0.5px solid var(--bdr2);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  color: var(--tx2);
  font-size: 12px;
  transition: border .15s;
  max-width: 280px;
  flex: 1;
}
.search-trigger:hover { border-color: var(--acc); }
.search-trigger i { font-size: 15px; }
.kb {
  font-size: 10px;
  background: var(--bg3);
  border: 0.5px solid var(--bdr2);
  border-radius: 4px;
  padding: 1px 5px;
  color: var(--tx3);
  margin-left: auto;
  font-family: inherit;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.tb-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg2);
  border: 0.5px solid var(--bdr);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--tx1);
  font-size: 17px;
  transition: all .15s;
  position: relative;
}
.tb-btn:hover { background: var(--bg3); color: var(--tx0); }
.notif-dot {
  width: 7px;
  height: 7px;
  background: var(--red);
  border-radius: 50%;
  position: absolute;
  top: 6px;
  right: 6px;
  border: 1.5px solid var(--bg1);
}

/* PROFILE */
.profile-wrap {
  position: relative;
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 4px;
  border-radius: 20px;
  background: var(--bg2);
  border: 0.5px solid var(--bdr);
  cursor: pointer;
  font-size: 12px;
  color: var(--tx0);
  transition: background .15s;
  user-select: none;
}
.user-chip:hover { background: var(--bg3); }
.chip-arrow {
  font-size: 13px;
  color: var(--tx2);
  transition: transform .2s;
}
.chip-arrow.rotated { transform: rotate(180deg); }

.profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: var(--bg1);
  border: 0.5px solid var(--bdr2);
  border-radius: 12px;
  overflow: hidden;
  z-index: 9000;
  padding: 6px 0;
}
.pd-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}
.pd-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.pd-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--tx0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pd-role {
  font-size: 10px;
  color: var(--acc);
  background: var(--acc-dim);
  padding: 1px 6px;
  border-radius: 20px;
  display: inline-block;
  width: fit-content;
}
.pd-correo {
  font-size: 11px;
  color: var(--tx2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pd-divider {
  height: 0.5px;
  background: var(--bdr);
  margin: 4px 0;
}
.pd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  font-size: 13px;
  color: var(--tx1);
  cursor: pointer;
  transition: background .12s;
}
.pd-item i { font-size: 16px; }
.pd-item:hover { background: var(--bg2); color: var(--tx0); }
.pd-item.danger { color: var(--red); }
.pd-item.danger:hover { background: var(--red-dim); }

/* Dropdown animation */
.dropdown-enter-active { transition: all .15s ease; }
.dropdown-leave-active { transition: all .1s ease; }
.dropdown-enter-from  { opacity: 0; transform: translateY(-6px); }
.dropdown-leave-to    { opacity: 0; transform: translateY(-6px); }

/* RESPONSIVE */
@media (max-width: 768px) {
  .search-trigger {
    max-width: 36px;
    min-width: 36px;
    padding: 0;
    justify-content: center;
    border-radius: 8px;
  }
  .search-trigger span,
  .search-trigger .kb { display: none; }
  .user-chip-name { display: none; }
  .user-chip { padding: 4px; border-radius: 50%; }
  .chip-arrow { display: none; }
}
</style>