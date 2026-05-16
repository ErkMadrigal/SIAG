<template>
  <aside class="sidebar" :class="{ collapsed: !ui.sidebarOpen }">
    <!-- Logo -->
    <div class="sb-logo">
      <div class="logo-icon">
        <i class="ti ti-shield-half" aria-hidden="true"></i>
      </div>
      <transition name="fade">
        <div v-if="ui.sidebarOpen" class="logo-text">
          <div class="logo-name">SkyNet</div>
          <div class="logo-sub">SIA v1.0</div>
        </div>
      </transition>
    </div>

    <!-- Nav -->
    <nav class="sb-nav">
      <!-- Home siempre visible -->
      <div class="nav-sec">
        <RouterLink
          to="/"
          class="ni"
          :class="{ active: $route.path === '/' }"
          @click="setPage('Home', [])"
        >
          <i class="ti ti-home" aria-hidden="true"></i>
          <span v-if="ui.sidebarOpen">Home</span>
        </RouterLink>

        <RouterLink
          to="/dashboard"
          class="ni"
          :class="{ active: $route.path === '/dashboard' }"
          @click="setPage('Dashboard', [{ label: 'Home', to: '/' }, { label: 'Dashboard', to: '/dashboard' }])"
        >
          <i class="ti ti-layout-dashboard" aria-hidden="true"></i>
          <span v-if="ui.sidebarOpen">Dashboard</span>
        </RouterLink>
      </div>

      <!-- Secciones dinámicas por vistas del JWT -->
      <template v-for="(section, sectionName) in groupedVistas" :key="sectionName">
        <div class="nav-sec">
          <div class="nav-sec-label" v-if="ui.sidebarOpen">{{ sectionName }}</div>
          <RouterLink
            v-for="item in section"
            :key="item.vista"
            :to="item.path"
            class="ni"
            :class="{ active: $route.path === item.path }"
            @click="setPage(item.label, item.breadcrumbs)"
          >
            <i :class="['ti', item.icon]" aria-hidden="true"></i>
            <span v-if="ui.sidebarOpen">{{ item.label }}</span>
            <span v-if="ui.sidebarOpen && item.badge" class="ni-badge" :class="item.badgeType">
              {{ item.badge }}
            </span>
          </RouterLink>
        </div>
      </template>
    </nav>

    <!-- Usuario -->
    <div class="sb-user">
      <AvatarInitials
        :initials="auth.userInitials"
        :size="32"
        :fontSize="12"
      />
      <transition name="fade">
        <div v-if="ui.sidebarOpen" class="sb-user-info">
          <p class="user-name">{{ auth.userName || 'Usuario' }}</p>
          <span class="role-badge">nivel {{ auth.userRole }} · {{ auth.user?.rol }}</span>
        </div>
      </transition>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore }   from '@/stores/ui.js'
import { VISTAS_MAP }   from '@/router/index.js'
import AvatarInitials   from '@/components/ui/AvatarInitials.vue'

const auth = useAuthStore()
const ui   = useUiStore()

// Agrupa las vistas del usuario por sección
const groupedVistas = computed(() => {
const vistas = auth.userVistas

  // SuperAdmin ve todo
  const vistaKeys = auth.userRole === 1
    ? Object.keys(VISTAS_MAP).filter(k => k !== 'home' && k !== 'dashboard')
    : vistas.filter(v => v !== 'home' && v !== 'dashboard')

  const groups = {}

  vistaKeys.forEach(vista => {
    const map = VISTAS_MAP[vista]
    if (!map || !map.section) return

    if (!groups[map.section]) groups[map.section] = []

    groups[map.section].push({
      vista,
      path:    map.path,
      label:   map.label,
      icon:    map.icon,
      badge:     getBadge(vista),
      badgeType: getBadgeType(vista),
      breadcrumbs: [
        { label: 'Home', to: '/' },
        { label: map.label, to: map.path }
      ]
    })
  })

  return groups
})

function getBadge(vista) {
  const badges = {
    empleados:  '1940',
    biometrico: '3',
    incidencias: '7',
    colaboradores: 'New',
  }
  return badges[vista] || null
}

function getBadgeType(vista) {
  if (vista === 'colaboradores') return 'new'
  if (vista === 'incidencias')   return 'alert'
  return 'cnt'
}

function setPage(label, crumbs) {
  ui.setBreadcrumbs(crumbs.length ? crumbs : [{ label, to: '#' }])
}
</script>

<style scoped>
.sidebar {
  width: 230px;
  min-width: 230px;
  background: var(--bg1);
  border-right: 0.5px solid var(--bdr);
  display: flex;
  flex-direction: column;
  transition: width .25s ease, min-width .25s ease;
}
.sidebar.collapsed {
  width: 56px;
  min-width: 56px;
}
.sb-logo {
  padding: 16px 14px 12px;
  border-bottom: 0.5px solid var(--bdr);
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}
.logo-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--acc);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  color: #fff;
}
.logo-name { font-size: 15px; font-weight: 600; color: var(--tx0); letter-spacing: -.3px; }
.logo-sub  { font-size: 10px; color: var(--tx2); margin-top: 1px; }
.sb-nav {
  flex: 1;
  padding: 10px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-sec { margin-bottom: 4px; }
.nav-sec-label {
  font-size: 10px;
  color: var(--tx3);
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 8px 8px 4px;
  font-weight: 500;
  white-space: nowrap;
}
.ni {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--tx1);
  text-decoration: none;
  transition: all .15s;
  white-space: nowrap;
  overflow: hidden;
}
.ni:hover  { background: var(--bg2); color: var(--tx0); }
.ni.active { background: var(--acc-dim); color: var(--acc); font-weight: 500; }
.ni i      { font-size: 16px; flex-shrink: 0; }
.ni-badge {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 20px;
  min-width: 18px;
  text-align: center;
  color: #fff;
}
.ni-badge.cnt   { background: var(--acc); }
.ni-badge.alert { background: var(--red); }
.ni-badge.new   { background: var(--grn); }
.sb-user {
  padding: 10px 12px;
  border-top: 0.5px solid var(--bdr);
  display: flex;
  align-items: center;
  gap: 9px;
  overflow: hidden;
}
.user-name  { font-size: 12px; font-weight: 500; color: var(--tx0); }
.role-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 20px;
  background: var(--acc-dim);
  color: var(--acc);
  display: inline-block;
  margin-top: 2px;
}
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>